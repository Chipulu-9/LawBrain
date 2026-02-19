/**
 * LawBrain — Document Ingestion Script
 *
 * Reads PDFs from the corpus/ directory, splits them into chunks,
 * generates embeddings via Gemini text-embedding-004, and writes
 * the chunks to Firestore for vector search.
 *
 * Usage:
 *   pnpm --filter @repo/ingestion run ingest
 */

import 'dotenv/config'

async function main() {
  console.log('LawBrain ingestion script — stub')
  console.log('Implement: PDF → chunk → embed → Firestore')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
