"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnostics = exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const standalone_1 = require("@trpc/server/adapters/standalone");
const router_1 = require("./trpc/router");
const rag_1 = require("./lib/rag");
const trpcHandler = (0, standalone_1.createHTTPHandler)({
    router: router_1.appRouter,
});
function normalizeTrpcUrl(url) {
    const [pathPart, queryPart] = url.split('?');
    let normalizedPath = pathPart;
    if (normalizedPath.startsWith('/api/trpc/')) {
        normalizedPath = normalizedPath.replace('/api/trpc/', '/');
    }
    else if (normalizedPath === '/api/trpc') {
        normalizedPath = '/';
    }
    else if (normalizedPath.startsWith('/trpc/')) {
        normalizedPath = normalizedPath.replace('/trpc/', '/');
    }
    else if (normalizedPath === '/trpc') {
        normalizedPath = '/';
    }
    return queryPart ? `${normalizedPath}?${queryPart}` : normalizedPath;
}
exports.api = (0, https_1.onRequest)({ cors: true }, (req, res) => {
    const requestOrigin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-trpc-source');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    console.log('[API] Incoming request', {
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
    });
    const originalUrl = req.url || '/';
    const normalizedUrl = normalizeTrpcUrl(originalUrl);
    req.url = normalizedUrl;
    console.log('[API] Normalized tRPC URL', {
        originalUrl,
        normalizedUrl,
    });
    trpcHandler(req, res);
});
exports.diagnostics = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    const requestOrigin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const report = await (0, rag_1.runRagDiagnostics)();
        res.status(200).json(report);
    }
    catch (error) {
        const err = error;
        res.status(500).json({
            error: err.message,
            stack: err.stack,
        });
    }
});
