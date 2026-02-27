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
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { glob } from 'glob'
import pdfParse from 'pdf-parse'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

type SupportedExt = '.pdf' | '.txt' | '.docx'

interface ChunkRecord {
  content: string
  chunkIndex: number
  source: string
  title: string
  pageNumber: number | null
}

function initAdmin() {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    })
  }

  return initializeApp()
}

let genai: GoogleGenerativeAI | null = null

async function getApiKeyFromSecretManager(): Promise<string | null> {
  const secretId = process.env.SECRET_MANAGER_SECRET || process.env.GOOGLE_SECRET_NAME
  if (!secretId) return null

  const client = new SecretManagerServiceClient()
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID

  let name = secretId
  if (!secretId.startsWith('projects/')) {
    if (!project)
      throw new Error('Missing GOOGLE_CLOUD_PROJECT or FIREBASE_PROJECT_ID for Secret Manager')
    name = `projects/${project}/secrets/${secretId}/versions/latest`
  }

  const [accessResponse] = await client.accessSecretVersion({ name })
  const payload = accessResponse.payload?.data?.toString()
  return payload ?? null
}

async function getApiKey(): Promise<string> {
  // try secret manager first
  try {
    const secret = await getApiKeyFromSecretManager()
    if (secret) return secret.trim()
  } catch (err) {
    console.warn('Secret Manager fetch failed:', (err as Error).message)
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY/GOOGLE_API_KEY (or SECRET_MANAGER_SECRET).')
  return apiKey
}

const app = initAdmin()
const db = getFirestore(app)

function splitIntoChunks(text: string, size = 1200, overlap = 200) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const chunks: string[] = []
  let start = 0

  while (start < normalized.length) {
    const end = Math.min(start + size, normalized.length)
    chunks.push(normalized.slice(start, end))
    if (end === normalized.length) break
    start = Math.max(0, end - overlap)
  }

  return chunks
}

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase() as SupportedExt

  if (ext === '.pdf') {
    const buffer = await readFile(filePath)
    const parsed = await pdfParse(buffer)
    return typeof parsed.text === 'string' ? parsed.text : String(parsed.text)
  }

  if (ext === '.txt') {
    const txtBuffer = await readFile(filePath)
    return txtBuffer.toString('utf8')
  }

  if (ext === '.docx') {
    // DOCX extraction requires a parser such as mammoth/docx parser.
    // This fallback keeps ingestion predictable without adding new deps.
    console.warn(`Skipping DOCX (unsupported parser): ${filePath}`)
    return ''
  }

  return ''
}

async function embed(text: string): Promise<number[]> {
  if (!genai) throw new Error('genai client not initialized')
  const model = genai.getGenerativeModel({ model: 'gemini-embedding-001' })
  const result = await model.embedContent(text)
  return result.embedding.values
}

async function ingestFile(filePath: string) {
  const content = await extractText(filePath)
  if (!content.trim()) return 0

  const relPath = path.relative(path.resolve(process.cwd(), '../..'), filePath)
  const title = path.basename(filePath)
  const chunks = splitIntoChunks(content)
  let written = 0

  console.log(`Ingesting ${title}: ${chunks.length} chunks`)

  await setDocumentMetadata(relPath, title)

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i]
    const embedding = await embed(chunk)

    const chunkRecord: ChunkRecord = {
      content: chunk,
      chunkIndex: i,
      source: relPath,
      title,
      pageNumber: null,
    }

    await db.collection('legal_chunks').add({
      ...chunkRecord,
      embedding,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    written += 1
  }

  return written
}

async function setDocumentMetadata(source: string, title: string) {
  const documentId = source.replace(/[^\w-]+/g, '_')
  await db.collection('legal_documents').doc(documentId).set(
    {
      source,
      title,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

async function main() {
  const workspaceRoot = path.resolve(process.cwd(), '../..')
  const docsDir = path.resolve(workspaceRoot, 'documents')
  const corpusDir = path.resolve(workspaceRoot, 'corpus')

  const patterns = [
    path.join(docsDir, '**/*.{pdf,txt,docx}'),
    path.join(corpusDir, '**/*.{pdf,txt,docx}'),
  ]

  const files = Array.from(new Set((await glob(patterns, { nodir: true })).sort()))

  if (files.length === 0) {
    console.log('No documents found in documents/ or corpus/.')
    return
  }

  // Initialize generative AI client (supports Secret Manager or env var)
  const apiKey = await getApiKey()
  genai = new GoogleGenerativeAI(apiKey)

  let totalChunks = 0
  for (const file of files) {
    totalChunks += await ingestFile(file)
  }

  console.log(`Ingestion complete. Indexed ${totalChunks} chunks from ${files.length} files.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
