"""
LawBrain — Python RAG Engine (Cloud Functions 2nd gen)

Two HTTP-triggered functions:
  - ingest_bucket  POST /ingest_bucket
      Triggers a Vertex AI RAG Engine import_files() job from GCS into
      the existing "lawbrain" corpus. Returns the LRO operation status.

  - ask_rag        POST /ask_rag
      Accepts {"query": "..."} and returns {"answer": "...", "citations": [...]}
      using Gemini 2.5 Flash with the RAG corpus attached as a grounding tool.

Environment variables:
  GOOGLE_CLOUD_PROJECT   GCP project ID
  VERTEX_LOCATION        Vertex AI region (default: us-central1)
  RAG_CORPUS_NAME        Full resource name of the lawbrain corpus:
                         projects/<project>/locations/<location>/ragCorpora/<id>
"""

import json
import os

import functions_framework
from google import genai
from google.cloud.aiplatform_v1beta1 import VertexRagDataServiceClient
from google.cloud.aiplatform_v1beta1.types import GcsSource, ImportRagFilesConfig
from google.genai import types

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ID = os.environ["GOOGLE_CLOUD_PROJECT"]
LOCATION = os.environ.get("VERTEX_LOCATION", "us-west1")
CORPUS_NAME = os.environ["RAG_CORPUS_NAME"]

BUCKET = "gs://lawbrain"

DEFAULT_GCS_FILES = [
    f"{BUCKET}/volume1.pdf",
    f"{BUCKET}/volume2.pdf",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _rag_data_client() -> VertexRagDataServiceClient:
    """Return a Vertex AI RAG Data Service client for the configured region."""
    return VertexRagDataServiceClient(
        client_options={"api_endpoint": f"{LOCATION}-aiplatform.googleapis.com"}
    )


def _genai_client() -> genai.Client:
    """Return a google-genai client backed by Vertex AI."""
    return genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)


def _extract_citations(response: types.GenerateContentResponse) -> list[dict]:
    """Map grounding_chunks from the model response into plain citation dicts."""
    citations: list[dict] = []

    candidate = response.candidates[0] if response.candidates else None
    if not candidate:
        return citations

    metadata = getattr(candidate, "grounding_metadata", None)
    if not metadata:
        return citations

    for chunk in getattr(metadata, "grounding_chunks", None) or []:
        ctx = getattr(chunk, "retrieved_context", None)
        if ctx:
            citations.append(
                {
                    "uri": getattr(ctx, "uri", None),
                    "title": getattr(ctx, "title", None),
                }
            )

    return citations


# ---------------------------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = [
    "https://lawbrain-c4581.web.app",
    "https://lawbrain-c4581.firebaseapp.com",
    "http://localhost:5173",
    "http://localhost:3000",
]


def _cors_headers(request) -> dict:
    origin = request.headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS or origin.startswith("http://localhost"):
        allowed_origin = origin
    else:
        allowed_origin = ALLOWED_ORIGINS[0]
    return {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600",
    }


def _handle_preflight(request):
    if request.method == "OPTIONS":
        return ("", 204, _cors_headers(request))
    return None


# ---------------------------------------------------------------------------
# Function 1 — ingest_bucket
# ---------------------------------------------------------------------------


@functions_framework.http
def ingest_bucket(request):
    """
    Trigger a Vertex AI RAG Engine import_files() job.

    Optional JSON body:
      { "gcs_files": ["gs://bucket/volume1.pdf", "gs://bucket/volume2.pdf"] }

    If omitted, defaults to volume1.pdf and volume2.pdf in the lawbrain bucket.

    Returns:
      202  { "status": "submitted", "operation_name": "...", "done": false }
      500  { "error": "..." }
    """
    preflight = _handle_preflight(request)
    if preflight:
        return preflight

    headers = {"Content-Type": "application/json", **_cors_headers(request)}

    try:
        body = request.get_json(silent=True) or {}
        gcs_files: list[str] = body.get("gcs_files", DEFAULT_GCS_FILES)

        client = _rag_data_client()

        # Trigger the import — RAG Engine handles chunking and embedding natively.
        operation = client.import_rag_files(
            parent=CORPUS_NAME,
            import_rag_files_config=ImportRagFilesConfig(
                gcs_source=GcsSource(uris=gcs_files),
            ),
        )

        payload = {
            "status": "submitted",
            "operation_name": operation.operation.name,
            "done": operation.done(),
            "gcs_files": gcs_files,
            "corpus": CORPUS_NAME,
        }

        return (json.dumps(payload), 202, headers)

    except Exception as exc:  # noqa: BLE001
        return (json.dumps({"error": str(exc)}), 500, headers)


# ---------------------------------------------------------------------------
# Function 2 — ask_rag
# ---------------------------------------------------------------------------


@functions_framework.http
def ask_rag(request):
    """
    Answer a legal question using Gemini 2.5 Flash + Vertex AI RAG grounding.

    Required JSON body:
      { "query": "What does the Companies Act say about directors?" }

    Returns:
      200  { "answer": "...", "citations": [{ "uri": "...", "title": "..." }] }
      400  { "error": "Missing required field: query" }
      500  { "error": "..." }
    """
    preflight = _handle_preflight(request)
    if preflight:
        return preflight

    headers = {"Content-Type": "application/json", **_cors_headers(request)}

    try:
        body = request.get_json(silent=True) or {}
        query: str = body.get("query", "").strip()
        response_language: str = body.get("response_language", "en")

        if not query:
            return (json.dumps({"error": "Missing required field: query"}), 400, headers)

        client = _genai_client()

        # Attach the lawbrain RAG corpus as a grounding tool.
        rag_tool = types.Tool(
            retrieval=types.Retrieval(
                vertex_rag_store=types.VertexRagStore(
                    rag_corpora=[CORPUS_NAME],
                )
            )
        )

        language_instructions: dict[str, str] = {
            "en": "Respond in English.",
            "bem": "Respond in Bemba (Ichibemba). Use clear, simple language.",
            "nya": "Respond in Nyanja (Chinyanja). Use clear, simple language.",
            "toi": "Respond in Tonga (Chitonga). Use clear, simple language.",
        }
        lang_instruction = language_instructions.get(response_language, language_instructions["en"])
        prompt = f"{lang_instruction}\n\nUser question: {query}"

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[rag_tool],
                temperature=0.7,
            ),
        )

        payload = {
            "answer": response.text,
            "citations": _extract_citations(response),
        }

        return (json.dumps(payload), 200, headers)

    except Exception as exc:  # noqa: BLE001
        return (json.dumps({"error": str(exc)}), 500, headers)
