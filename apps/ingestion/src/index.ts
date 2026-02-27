/**
 * LawBrain — Document Ingestion Script
 *
 * Reads legal docs from documents/ (and corpus/ fallback), splits them into chunks,
 * generates embeddings via Gemini gemini-embedding-001, and writes
 * chunks + metadata to Firestore for semantic retrieval.
 *
 * Usage:
 *   pnpm --filter @repo/ingestion run ingest
 */

import 'dotenv/config'
import path from 'node:path'
import { constants as fsConstants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { glob } from 'glob'
import pdfParse from 'pdf-parse'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

type SupportedExt = '.pdf' | '.txt' | '.docx' | '.csv'

interface ChunkRecord {
  content: string
  chunkIndex: number
  source: string
  title: string
  pageNumber: number | null
}

interface IngestOptions {
  geminiApiKey?: string
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

const app = initAdmin()
const db = getFirestore(app)

const CHUNK_TARGET_WORDS = 400
const CHUNK_MIN_WORDS = 300
const CHUNK_MAX_WORDS = 500
const CHUNK_OVERLAP_WORDS = 60

function normalizeUtf8(text: string) {
  return text.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim()
}

function splitIntoChunks(text: string) {
  const normalized = normalizeUtf8(text)
  if (!normalized) return []

  const words = normalized.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const chunks: string[] = []
  let start = 0

  while (start < words.length) {
    const hardMax = Math.min(start + CHUNK_MAX_WORDS, words.length)
    let end = Math.min(start + CHUNK_TARGET_WORDS, words.length)

    if (end < words.length) {
      while (end < hardMax && !/[.!?]["')\]]?$/.test(words[end - 1] ?? '')) {
        end += 1
      }
      if (end - start < CHUNK_MIN_WORDS) {
        end = Math.min(start + CHUNK_MIN_WORDS, words.length)
      }
    }

    const chunkText = words.slice(start, end).join(' ').trim()
    if (chunkText.length > 0) {
      chunks.push(chunkText)
    }

    if (end >= words.length) break
    start = Math.max(start + 1, end - CHUNK_OVERLAP_WORDS)
  }

  return chunks
}

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase() as SupportedExt
  try {
    if (ext === '.pdf') {
      const buffer = await readFile(filePath)
      const parsed = await pdfParse(buffer)
      return typeof parsed.text === 'string' ? parsed.text : String(parsed.text)
    }

    if (ext === '.txt' || ext === '.csv') {
      const txtBuffer = await readFile(filePath)
      return txtBuffer.toString('utf8')
    }

    if (ext === '.docx') {
      // DOCX extraction requires a parser such as mammoth/docx parser.
      // This fallback keeps ingestion predictable without adding new deps.
      console.warn(`[INGEST] Skipping DOCX (unsupported parser): ${filePath}`)
      return ''
    }

    return ''
  } catch (error) {
    const err = error as Error
    console.error(`[INGEST] Failed to parse file: ${filePath}`, err.message)
    return ''
  }
}

async function embed(text: string, genai: GoogleGenerativeAI): Promise<number[]> {
  try {
    const model = genai.getGenerativeModel({ model: 'gemini-embedding-001' })
    const result = await model.embedContent(text)
    return result.embedding.values
  } catch (error) {
    const err = error as Error
    console.error('[INGEST] Embedding generation failed:', err.message)
    throw error
  }
}

async function ingestFile(filePath: string, genai: GoogleGenerativeAI) {
  console.log(`[INGEST] Loading file: ${filePath}`)
  const content = await extractText(filePath)
  if (!content.trim()) {
    console.warn(`[INGEST] No extractable content: ${filePath}`)
    return 0
  }

  console.log(`[INGEST] Extracted ${content.length} characters from ${filePath}`)

  const relPath = path.relative(path.resolve(process.cwd(), '../..'), filePath)
  const title = path.basename(filePath)
  const chunks = splitIntoChunks(content)
  if (chunks.length === 0) {
    console.warn(`[INGEST] No chunks generated after normalization: ${filePath}`)
    return 0
  }

  const wordCounts = chunks.map(chunk => chunk.split(/\s+/).filter(Boolean).length)
  const minWords = Math.min(...wordCounts)
  const maxWords = Math.max(...wordCounts)
  let written = 0
  let embeddingsGenerated = 0

  console.log(`[INGEST] Ingesting ${title}: ${chunks.length} chunks (${minWords}-${maxWords} words)`)

  await setDocumentMetadata(relPath, title)

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i]
    let embedding: number[]
    try {
      embedding = await embed(chunk, genai)
      embeddingsGenerated += 1
    } catch {
      console.error(`[INGEST] Skipping chunk ${i} due to embedding failure: ${filePath}`)
      continue
    }

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

  console.log(`[INGEST] Embeddings generated for ${title}: ${embeddingsGenerated}`)

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

export async function ingestDocuments(_data: unknown = {}, options: IngestOptions = {}) {
  const apiKey = options.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY/GOOGLE_API_KEY.')
  }
  const genai = new GoogleGenerativeAI(apiKey)

  const workspaceRoot = path.resolve(process.cwd(), '../..')
  const docsDir = path.resolve(workspaceRoot, 'documents')
  const corpusDir = path.resolve(workspaceRoot, 'corpus')

  try {
    await access(docsDir, fsConstants.R_OK)
    console.log(`[INGEST] documents directory readable: ${docsDir}`)
  } catch {
    console.warn(`[INGEST] documents directory missing or unreadable: ${docsDir}`)
  }

  try {
    await access(corpusDir, fsConstants.R_OK)
    console.log(`[INGEST] corpus directory readable: ${corpusDir}`)
  } catch {
    console.warn(`[INGEST] corpus directory missing or unreadable: ${corpusDir}`)
  }

  const patterns = [
    path.join(docsDir, '**/*.{pdf,txt,docx,csv}'),
    path.join(corpusDir, '**/*.{pdf,txt,docx,csv}'),
  ]

  const files = Array.from(new Set((await glob(patterns, { nodir: true })).sort()))

  if (files.length === 0) {
    console.log('No documents found in documents/ or corpus/.')
    return
  }

  console.log(`[INGEST] Documents discovered: ${files.length}`)

  let totalChunks = 0
  for (const file of files) {
    totalChunks += await ingestFile(file, genai)
  }

  console.log(`[INGEST] Ingestion complete. Indexed ${totalChunks} chunks from ${files.length} files.`)
  return {
    files: files.length,
    chunks: totalChunks,
  }
}
