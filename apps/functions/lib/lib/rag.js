"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveRelevantChunks = retrieveRelevantChunks;
exports.generateRagAnswer = generateRagAnswer;
exports.runRagDiagnostics = runRagDiagnostics;
const generative_ai_1 = require("@google/generative-ai");
const secret_manager_1 = require("@google-cloud/secret-manager");
const firebaseAdmin_1 = require("./firebaseAdmin");
const CHUNK_COLLECTION = 'legal_chunks';
console.log('=== ENV CHECK ===');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET' : 'MISSING');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'SET' : 'MISSING');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'MISSING');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING');
console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? 'SET' : 'MISSING');
function cosineSimilarity(a, b) {
    if (a.length !== b.length || a.length === 0)
        return -1;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0)
        return -1;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
function getGeminiClient() {
    throw new Error('getGeminiClient was called synchronously; use getGeminiClientAsync instead.');
}
let cachedApiKey = null;
async function getApiKeyFromSecretManager() {
    const secretId = process.env.SECRET_MANAGER_SECRET || process.env.GOOGLE_SECRET_NAME;
    if (!secretId)
        return null;
    const client = new secret_manager_1.SecretManagerServiceClient();
    const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
    let name = secretId;
    if (!secretId.startsWith('projects/')) {
        if (!project)
            throw new Error('Missing GOOGLE_CLOUD_PROJECT or FIREBASE_PROJECT_ID for Secret Manager');
        name = `projects/${project}/secrets/${secretId}/versions/latest`;
    }
    const [accessResponse] = await client.accessSecretVersion({ name });
    const payload = accessResponse.payload?.data?.toString();
    return payload ?? null;
}
async function getApiKey() {
    if (cachedApiKey)
        return cachedApiKey;
    // Prefer secret manager
    try {
        const secret = await getApiKeyFromSecretManager();
        if (secret) {
            cachedApiKey = secret.trim();
            return cachedApiKey;
        }
    }
    catch (err) {
        console.warn('Secret Manager fetch failed:', err.message);
    }
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey)
        throw new Error('Missing GEMINI_API_KEY/GOOGLE_API_KEY (or SECRET_MANAGER_SECRET) for RAG generation.');
    cachedApiKey = apiKey;
    return apiKey;
}
async function getGeminiClientAsync() {
    const apiKey = await getApiKey();
    return new generative_ai_1.GoogleGenerativeAI(apiKey);
}
async function embedText(text) {
    console.log('=== SEARCHING DOCUMENTS ===');
    console.log('Query:', text.slice(0, 240));
    const client = await getGeminiClientAsync();
    const model = client.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
}
async function retrieveRelevantChunks(question, topK = 5) {
    const queryEmbedding = await embedText(question);
    const snapshot = await firebaseAdmin_1.adminDb.collection(CHUNK_COLLECTION).get();
    const ranked = snapshot.docs
        .map(docSnap => {
        const data = docSnap.data();
        if (!data.content || !data.source || !data.title || !data.embedding || !Array.isArray(data.embedding)) {
            return null;
        }
        const score = cosineSimilarity(queryEmbedding, data.embedding);
        return {
            score,
            chunk: {
                source: data.source,
                title: data.title,
                pageNumber: data.pageNumber ?? null,
                chunkIndex: data.chunkIndex ?? 0,
                snippet: data.content.slice(0, 420),
                content: data.content,
            },
        };
    })
        .filter((item) => item !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    console.log('=== DOCUMENTS FOUND ===');
    console.log('Number of results:', ranked.length);
    console.log('Document snippets:', ranked.map(item => item.chunk.content.slice(0, 100)));
    return ranked;
}
function buildPrompt(question, contexts) {
    return `You are a Zambian legal assistant. Answer ONLY from the legal context below. If context is insufficient, say so clearly.\n\nContext:\n${contexts.join('\n\n')}\n\nUser Question: ${question}\n\nProvide an accurate answer and cite relevant laws/sections in plain text.`;
}
function formatContext(chunk) {
    return `[Source: ${chunk.title} | File: ${chunk.source} | Page: ${chunk.pageNumber ?? 'n/a'} | Chunk: ${chunk.chunkIndex}]\n${chunk.content}`;
}
async function generateRagAnswer(question) {
    try {
        const ranked = await retrieveRelevantChunks(question, 5);
        const contexts = ranked.map(item => item.chunk);
        if (contexts.length === 0) {
            return {
                answer: 'I could not find relevant legal context in the indexed documents yet.',
                sources: [],
            };
        }
        const prompt = buildPrompt(question, contexts.map(formatContext));
        console.log('=== CALLING LLM ===');
        console.log('Prompt length:', prompt.length);
        console.log('API Key present:', !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY);
        const client = await getGeminiClientAsync();
        const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        const generation = await model.generateContent(prompt);
        const answer = generation.response.text();
        console.log('=== LLM RESPONSE ===');
        console.log('Response length:', answer.length);
        const sources = contexts.map(chunk => ({
            source: chunk.source,
            title: chunk.title,
            pageNumber: chunk.pageNumber,
            chunkIndex: chunk.chunkIndex,
            snippet: chunk.snippet,
        }));
        return {
            answer,
            sources,
        };
    }
    catch (error) {
        const err = error;
        const message = err.message || '';
        console.error('=== ERROR ===');
        console.error('Error type:', err.name || 'UnknownError');
        console.error('Error message:', message);
        console.error('Stack:', err.stack);
        if (message.toLowerCase().includes('api key')) {
            console.error('Missing or invalid API key');
        }
        else if (message.toLowerCase().includes('rate limit')) {
            console.error('Rate limited by API');
        }
        else if (message.includes('ECONNREFUSED')) {
            console.error('Cannot connect to external service');
        }
        throw error;
    }
}
async function runRagDiagnostics() {
    const envVars = {
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
        PINECONE_API_KEY: !!process.env.PINECONE_API_KEY,
    };
    const result = {
        envVars,
        documents: {
            count: 0,
            sample: null,
        },
        vectorDB: {
            connected: false,
            indexCount: 0,
        },
        llm: {
            working: false,
        },
    };
    try {
        const countAggregate = await firebaseAdmin_1.adminDb.collection(CHUNK_COLLECTION).count().get();
        result.documents.count = countAggregate.data().count;
        result.vectorDB.indexCount = countAggregate.data().count;
        result.vectorDB.connected = true;
        const sampleSnap = await firebaseAdmin_1.adminDb.collection(CHUNK_COLLECTION).limit(1).get();
        const sampleDoc = sampleSnap.docs[0]?.data();
        if (sampleDoc?.source && sampleDoc?.title) {
            result.documents.sample = {
                source: sampleDoc.source,
                title: sampleDoc.title,
            };
        }
    }
    catch (error) {
        const err = error;
        result.documents.error = err.message;
        result.vectorDB.error = err.message;
    }
    try {
        const client = await getGeminiClientAsync();
        const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        const llmTest = await model.generateContent('Say hello in one short sentence.');
        const text = llmTest.response.text();
        result.llm.working = text.trim().length > 0;
    }
    catch (error) {
        const err = error;
        result.llm.error = err.message;
    }
    return result;
}
