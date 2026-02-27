import vertexai
from vertexai.preview import rag

PROJECT = "lawbrain-c4581"

for location in ["us-central1", "us-east1", "europe-west1", "asia-northeast1"]:
    vertexai.init(project=PROJECT, location=location)
    corpora = list(rag.list_corpora())
    if corpora:
        print(f"\n--- Found in {location} ---")
        for c in corpora:
            print(f"  Name:    {c.name}")
            print(f"  Display: {c.display_name}")
    else:
        print(f"{location}: no corpora found")
