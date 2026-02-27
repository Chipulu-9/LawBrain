"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestDocuments = ingestDocuments;
require("dotenv/config");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const glob_1 = require("glob");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const generative_ai_1 = require("@google/generative-ai");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
function initAdmin() {
    if ((0, app_1.getApps)().length > 0)
        return (0, app_1.getApps)()[0];
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (projectId && clientEmail && privateKey) {
        return (0, app_1.initializeApp)({
            credential: (0, app_1.cert)({ projectId, clientEmail, privateKey }),
        });
    }
    return (0, app_1.initializeApp)();
}
const app = initAdmin();
const db = (0, firestore_1.getFirestore)(app);
const CHUNK_TARGET_WORDS = 400;
const CHUNK_MIN_WORDS = 300;
const CHUNK_MAX_WORDS = 500;
const CHUNK_OVERLAP_WORDS = 60;
function normalizeUtf8(text) {
    return text.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim();
}
function splitIntoChunks(text) {
    const normalized = normalizeUtf8(text);
    if (!normalized)
        return [];
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length === 0)
        return [];
    const chunks = [];
    let start = 0;
    while (start < words.length) {
        const hardMax = Math.min(start + CHUNK_MAX_WORDS, words.length);
        let end = Math.min(start + CHUNK_TARGET_WORDS, words.length);
        if (end < words.length) {
            while (end < hardMax && !/[.!?]["')\]]?$/.test(words[end - 1] ?? '')) {
                end += 1;
            }
            if (end - start < CHUNK_MIN_WORDS) {
                end = Math.min(start + CHUNK_MIN_WORDS, words.length);
            }
        }
        const chunkText = words.slice(start, end).join(' ').trim();
        if (chunkText.length > 0) {
            chunks.push(chunkText);
        }
        if (end >= words.length)
            break;
        start = Math.max(start + 1, end - CHUNK_OVERLAP_WORDS);
    }
    return chunks;
}
async function extractText(filePath) {
    const ext = node_path_1.default.extname(filePath).toLowerCase();
    try {
        if (ext === '.pdf') {
            const buffer = await (0, promises_1.readFile)(filePath);
            const parsed = await (0, pdf_parse_1.default)(buffer);
            return typeof parsed.text === 'string' ? parsed.text : String(parsed.text);
        }
        if (ext === '.txt' || ext === '.csv') {
            const txtBuffer = await (0, promises_1.readFile)(filePath);
            return txtBuffer.toString('utf8');
        }
        if (ext === '.docx') {
            // DOCX extraction requires a parser such as mammoth/docx parser.
            // This fallback keeps ingestion predictable without adding new deps.
            console.warn(`[INGEST] Skipping DOCX (unsupported parser): ${filePath}`);
            return '';
        }
        return '';
    }
    catch (error) {
        const err = error;
        console.error(`[INGEST] Failed to parse file: ${filePath}`, err.message);
        return '';
    }
}
async function embed(text, genai) {
    try {
        const model = genai.getGenerativeModel({ model: 'gemini-embedding-001' });
        const result = await model.embedContent(text);
        return result.embedding.values;
    }
    catch (error) {
        const err = error;
        console.error('[INGEST] Embedding generation failed:', err.message);
        throw error;
    }
}
async function ingestFile(filePath, genai) {
    console.log(`[INGEST] Loading file: ${filePath}`);
    const content = await extractText(filePath);
    if (!content.trim()) {
        console.warn(`[INGEST] No extractable content: ${filePath}`);
        return 0;
    }
    console.log(`[INGEST] Extracted ${content.length} characters from ${filePath}`);
    const relPath = node_path_1.default.relative(node_path_1.default.resolve(process.cwd(), '../..'), filePath);
    const title = node_path_1.default.basename(filePath);
    const chunks = splitIntoChunks(content);
    if (chunks.length === 0) {
        console.warn(`[INGEST] No chunks generated after normalization: ${filePath}`);
        return 0;
    }
    const wordCounts = chunks.map(chunk => chunk.split(/\s+/).filter(Boolean).length);
    const minWords = Math.min(...wordCounts);
    const maxWords = Math.max(...wordCounts);
    let written = 0;
    let embeddingsGenerated = 0;
    console.log(`[INGEST] Ingesting ${title}: ${chunks.length} chunks (${minWords}-${maxWords} words)`);
    await setDocumentMetadata(relPath, title);
    for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        let embedding;
        try {
            embedding = await embed(chunk, genai);
            embeddingsGenerated += 1;
        }
        catch {
            console.error(`[INGEST] Skipping chunk ${i} due to embedding failure: ${filePath}`);
            continue;
        }
        const chunkRecord = {
            content: chunk,
            chunkIndex: i,
            source: relPath,
            title,
            pageNumber: null,
        };
        await db.collection('legal_chunks').add({
            ...chunkRecord,
            embedding,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        written += 1;
    }
    console.log(`[INGEST] Embeddings generated for ${title}: ${embeddingsGenerated}`);
    return written;
}
async function setDocumentMetadata(source, title) {
    const documentId = source.replace(/[^\w-]+/g, '_');
    await db.collection('legal_documents').doc(documentId).set({
        source,
        title,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
}
async function ingestDocuments(_data = {}, options = {}) {
    const apiKey = options.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('Missing GEMINI_API_KEY/GOOGLE_API_KEY.');
    }
    const genai = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const workspaceRoot = node_path_1.default.resolve(process.cwd(), '../..');
    const docsDir = node_path_1.default.resolve(workspaceRoot, 'documents');
    const corpusDir = node_path_1.default.resolve(workspaceRoot, 'corpus');
    try {
        await (0, promises_1.access)(docsDir, node_fs_1.constants.R_OK);
        console.log(`[INGEST] documents directory readable: ${docsDir}`);
    }
    catch {
        console.warn(`[INGEST] documents directory missing or unreadable: ${docsDir}`);
    }
    try {
        await (0, promises_1.access)(corpusDir, node_fs_1.constants.R_OK);
        console.log(`[INGEST] corpus directory readable: ${corpusDir}`);
    }
    catch {
        console.warn(`[INGEST] corpus directory missing or unreadable: ${corpusDir}`);
    }
    const patterns = [
        node_path_1.default.join(docsDir, '**/*.{pdf,txt,docx,csv}'),
        node_path_1.default.join(corpusDir, '**/*.{pdf,txt,docx,csv}'),
    ];
    const files = Array.from(new Set((await (0, glob_1.glob)(patterns, { nodir: true })).sort()));
    if (files.length === 0) {
        console.log('No documents found in documents/ or corpus/.');
        return;
    }
    console.log(`[INGEST] Documents discovered: ${files.length}`);
    let totalChunks = 0;
    for (const file of files) {
        totalChunks += await ingestFile(file, genai);
    }
    console.log(`[INGEST] Ingestion complete. Indexed ${totalChunks} chunks from ${files.length} files.`);
    return {
        files: files.length,
        chunks: totalChunks,
    };
}
