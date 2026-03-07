# Google Cloud Secret Manager Setup

This project uses **Google Cloud Secret Manager** to securely store and retrieve API keys instead of relying on environment variables alone. This guide covers setup and usage.

## Overview

The project now supports two ways to fetch API keys:

1. **Primary (Recommended):** Google Cloud Secret Manager — securely stores and manages secrets
2. **Fallback:** Environment variables (`GEMINI_API_KEY` or `GOOGLE_API_KEY`) — for local development

The code will attempt Secret Manager first; if unavailable or misconfigured, it falls back to env vars.

## Prerequisites

- Google Cloud Project with billing enabled
- `gcloud` CLI installed and authenticated
- Appropriate IAM roles (e.g., `roles/secretmanager.secretAccessor`) or higher

## Setup Steps

### 1. Create a Secret in Google Cloud Secret Manager

```bash
# Set your project ID
export PROJECT_ID="your-google-cloud-project-id"

# Create a new secret named "gemini-api-key"
gcloud secrets create gemini-api-key \
  --replication-policy="automatic" \
  --project=$PROJECT_ID

# Add the API key value
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | \
  gcloud secrets versions add gemini-api-key \
    --data-file=- \
    --project=$PROJECT_ID
```

### 2. Configure Environment Variables

Set these environment variables in your deployment environment (Cloud Run, Cloud Functions, or local `.env`):

```bash
# Required: Secret Manager secret name or full resource path
SECRET_MANAGER_SECRET="gemini-api-key"
# OR full path format:
# SECRET_MANAGER_SECRET="projects/PROJECT_ID/secrets/gemini-api-key/versions/latest"

# Required: GCP project ID (used to construct secret path if not full path)
GOOGLE_CLOUD_PROJECT="your-google-cloud-project-id"
# OR (Firebase projects)
FIREBASE_PROJECT_ID="your-firebase-project-id"

# Optional: fallback for local development
GEMINI_API_KEY="your-api-key"  # Only checked if Secret Manager fetch fails
```

### 3. Set IAM Permissions

Grant the service account running your Cloud Functions or Cloud Run service access to the secret:

```bash
# Get your service account (for Cloud Functions)
export SERVICE_ACCOUNT="PROJECT_ID@cloudfunctions.iam.gserviceaccount.com"

# Grant Secret Accessor role
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

For Cloud Run, use the Cloud Run service account:

```bash
export SERVICE_ACCOUNT="PROJECT_ID@appspot.gserviceaccount.com"
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

## Local Development

For local testing, you can use any of these approaches:

### Option A: Application Default Credentials (ADC)

```bash
# Authenticate locally
gcloud auth application-default login

# Set env vars
export GOOGLE_CLOUD_PROJECT="your-project-id"
export SECRET_MANAGER_SECRET="gemini-api-key"

# Run ingestion or functions locally
pnpm --filter @repo/ingestion run ingest
```

### Option B: Service Account Key File

```bash
# Create a service account key from GCP Console or:
gcloud iam service-accounts keys create sa-key.json \
  --iam-account=PROJECT_ID@iam.gserviceaccount.com

# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa-key.json"
export GOOGLE_CLOUD_PROJECT="your-project-id"
export SECRET_MANAGER_SECRET="gemini-api-key"
```

### Option C: Environment Variable Fallback (Easiest for Local Dev)

```bash
# Just set the API key directly (no Secret Manager needed locally)
export GEMINI_API_KEY="your-api-key"

# Run scripts
pnpm --filter @repo/ingestion run ingest
```

## Code Implementation

### Functions RAG Retrieval

File: [apps/functions/src/lib/rag.ts](../../apps/functions/src/lib/rag.ts)

- `getApiKeyFromSecretManager()` — Fetches secret from GCP
- `getApiKey()` — Tries Secret Manager, falls back to env vars
- `getGeminiClientAsync()` — Creates GoogleGenerativeAI client with retrieved key

**Usage:**

```typescript
const client = await getGeminiClientAsync()
const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
const response = await model.generateContent(prompt)
```

### Ingestion Script

File: [apps/ingestion/src/index.ts](../../apps/ingestion/src/index.ts)

- Same retrieval pattern: Secret Manager → fallback to env vars
- Initializes client in `main()` after fetching API key

**Usage:**

```bash
# Run with local fallback
export GEMINI_API_KEY="your-key"
pnpm --filter @repo/ingestion run ingest

# Or with Secret Manager
export GOOGLE_CLOUD_PROJECT="your-project"
export SECRET_MANAGER_SECRET="gemini-api-key"
pnpm --filter @repo/ingestion run ingest
```

## Deployment

### Cloud Functions

1. Deploy your function with Secret Manager env vars:

```bash
gcloud functions deploy ragFunction \
  --runtime nodejs20 \
  --trigger-topic rag-trigger \
  --set-env-vars \
    GOOGLE_CLOUD_PROJECT=your-project-id,\
    SECRET_MANAGER_SECRET=gemini-api-key \
  --project=$PROJECT_ID
```

2. Ensure the function's service account has `roles/secretmanager.secretAccessor` on the secret.

### Cloud Run

```bash
gcloud run deploy lawbrain-api \
  --source=. \
  --region=us-central1 \
  --set-env-vars \
    GOOGLE_CLOUD_PROJECT=your-project-id,\
    SECRET_MANAGER_SECRET=gemini-api-key \
  --project=$PROJECT_ID
```

### Firebase Functions (with Firestore)

```bash
firebase deploy --only functions \
  --project=$PROJECT_ID
```

Ensure your `firebase.json` or function config includes:

```json
{
  "functions": {
    "runtime": "nodejs20",
    "env": [
      {
        "name": "GOOGLE_CLOUD_PROJECT",
        "value": "your-project-id"
      },
      {
        "name": "SECRET_MANAGER_SECRET",
        "value": "gemini-api-key"
      }
    ]
  }
}
```

## Rotating Secrets

To rotate the API key:

```bash
# Add a new version
echo -n "NEW_API_KEY" | \
  gcloud secrets versions add gemini-api-key \
    --data-file=- \
    --project=$PROJECT_ID

# Verify latest version is used (code always references /versions/latest)
gcloud secrets versions list gemini-api-key --project=$PROJECT_ID
```

No code changes needed — the `:latest` version is always fetched.

## Troubleshooting

### "Missing GOOGLE_CLOUD_PROJECT or FIREBASE_PROJECT_ID"

- Set `GOOGLE_CLOUD_PROJECT` or `FIREBASE_PROJECT_ID` env var
- Required for constructing the Secret Manager resource name

### "Secret Manager fetch failed"

- Check IAM permissions: service account must have `roles/secretmanager.secretAccessor`
- Verify secret exists: `gcloud secrets list --project=$PROJECT_ID`
- Check credentials: `gcloud auth application-default print-access-token`

### Default to env vars while debugging

- Set `GEMINI_API_KEY` to bypass Secret Manager
- Check logs: `gcloud functions logs read ragFunction --limit=50`

## References

- [Google Cloud Secret Manager Docs](https://cloud.google.com/secret-manager/docs)
- [Secret Manager Pricing](https://cloud.google.com/secret-manager/pricing)
- [Secret Manager Python Client](https://cloud.google.com/nodejs/docs/reference/secret-manager/latest)
