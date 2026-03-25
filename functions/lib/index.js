"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editSlidesHttp = exports.generateSlidesHttp = exports.generateSlides = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");
const openai_1 = require("./services/openai");
admin.initializeApp();
const corsHandler = cors({
    origin: true,
    methods: ['OPTIONS', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});
exports.generateSlides = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 300,
    memory: '1GB',
    secrets: ['OPENAI_API_KEY'],
})
    .https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to generate slides.');
    }
    const prompt = typeof (data === null || data === void 0 ? void 0 : data.prompt) === 'string' ? data.prompt.trim() : '';
    if (!prompt)
        throw new functions.https.HttpsError('invalid-argument', 'Prompt is required.');
    if (prompt.length > 8000)
        throw new functions.https.HttpsError('invalid-argument', 'Prompt is too long.');
    const modelName = typeof (data === null || data === void 0 ? void 0 : data.modelName) === 'string' ? data.modelName : 'gpt-4o-mini';
    try {
        const result = await (0, openai_1.generateSlidesPayload)(prompt, modelName);
        return result;
    }
    catch (err) {
        const e = err;
        if (e.code === 'resource-exhausted') {
            throw new functions.https.HttpsError('resource-exhausted', `Rate limit exceeded. Try again in ${(_a = e.retryAfter) !== null && _a !== void 0 ? _a : 60} seconds.`, { retryAfter: e.retryAfter });
        }
        if (e.code === 'failed-precondition') {
            throw new functions.https.HttpsError('failed-precondition', (_b = e.message) !== null && _b !== void 0 ? _b : 'Not configured.');
        }
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('rate limit') || msg.includes('429')) {
            throw new functions.https.HttpsError('resource-exhausted', 'OpenAI rate limit reached.', { retryAfter: 60 });
        }
        functions.logger.error('OpenAI error', err);
        throw new functions.https.HttpsError('internal', 'Failed to generate slides. Please try again.');
    }
});
exports.generateSlidesHttp = functions
    .runWith({
    timeoutSeconds: 300,
    memory: '1GB',
    secrets: ['OPENAI_API_KEY'],
})
    .region('us-central1')
    .https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        var _a, _b;
        if (req.method === 'OPTIONS') {
            res.status(204).end();
            return;
        }
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed.' });
            return;
        }
        const authHeader = req.headers.authorization;
        const token = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) ? authHeader.slice(7) : '';
        if (!token) {
            res.status(401).json({ error: 'Missing or invalid Authorization header.' });
            return;
        }
        try {
            await admin.auth().verifyIdToken(token);
        }
        catch (_c) {
            res.status(401).json({ error: 'Invalid or expired token.' });
            return;
        }
        const body = req.body;
        const prompt = typeof (body === null || body === void 0 ? void 0 : body.prompt) === 'string' ? body.prompt.trim() : '';
        const modelName = typeof (body === null || body === void 0 ? void 0 : body.modelName) === 'string' ? body.modelName : 'gpt-4o-mini';
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required.' });
            return;
        }
        if (prompt.length > 8000) {
            res.status(400).json({ error: 'Prompt is too long.' });
            return;
        }
        try {
            const result = await (0, openai_1.generateSlidesPayload)(prompt, modelName);
            res.status(200).json(result);
        }
        catch (err) {
            const e = err;
            if (e.code === 'resource-exhausted') {
                res.status(429).json({
                    error: `Rate limit exceeded. Try again in ${(_a = e.retryAfter) !== null && _a !== void 0 ? _a : 60} seconds.`,
                    retryAfter: e.retryAfter,
                });
                return;
            }
            if (e.code === 'failed-precondition') {
                res.status(503).json({ error: (_b = e.message) !== null && _b !== void 0 ? _b : 'Not configured.' });
                return;
            }
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('rate limit') || msg.includes('429')) {
                res.status(429).json({ error: 'OpenAI rate limit reached.', retryAfter: 60 });
                return;
            }
            functions.logger.error('OpenAI error', err);
            res.status(500).json({ error: 'Failed to generate slides. Please try again.' });
        }
    });
});
exports.editSlidesHttp = functions
    .runWith({
    timeoutSeconds: 300,
    memory: '1GB',
    secrets: ['OPENAI_API_KEY'],
})
    .region('us-central1')
    .https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        var _a, _b;
        if (req.method === 'OPTIONS') {
            res.status(204).end();
            return;
        }
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed.' });
            return;
        }
        const authHeader = req.headers.authorization;
        const token = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) ? authHeader.slice(7) : '';
        if (!token) {
            res.status(401).json({ error: 'Missing or invalid Authorization header.' });
            return;
        }
        try {
            await admin.auth().verifyIdToken(token);
        }
        catch (_c) {
            res.status(401).json({ error: 'Invalid or expired token.' });
            return;
        }
        const body = req.body;
        const requestText = typeof (body === null || body === void 0 ? void 0 : body.request) === 'string' ? body.request.trim() : '';
        const selectedSlideId = typeof (body === null || body === void 0 ? void 0 : body.selectedSlideId) === 'string' ? body.selectedSlideId : undefined;
        const modelName = typeof (body === null || body === void 0 ? void 0 : body.modelName) === 'string' ? body.modelName : 'gpt-4o-mini';
        const currentSlides = Array.isArray(body === null || body === void 0 ? void 0 : body.currentSlides) ? body.currentSlides : [];
        const availableAssets = Array.isArray(body === null || body === void 0 ? void 0 : body.availableAssets) ? body.availableAssets : [];
        if (!requestText) {
            res.status(400).json({ error: 'Request is required.' });
            return;
        }
        if (requestText.length > 8000) {
            res.status(400).json({ error: 'Request is too long.' });
            return;
        }
        try {
            const result = await (0, openai_1.editSlidesPayload)(requestText, currentSlides, selectedSlideId, availableAssets, modelName);
            res.status(200).json(result);
        }
        catch (err) {
            const e = err;
            if (e.code === 'resource-exhausted') {
                res.status(429).json({
                    error: `Rate limit exceeded. Try again in ${(_a = e.retryAfter) !== null && _a !== void 0 ? _a : 60} seconds.`,
                    retryAfter: e.retryAfter,
                });
                return;
            }
            if (e.code === 'failed-precondition') {
                res.status(503).json({ error: (_b = e.message) !== null && _b !== void 0 ? _b : 'Not configured.' });
                return;
            }
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('rate limit') || msg.includes('429')) {
                res.status(429).json({ error: 'OpenAI rate limit reached.', retryAfter: 60 });
                return;
            }
            functions.logger.error('OpenAI error', err);
            res.status(500).json({ error: 'Failed to edit slides. Please try again.' });
        }
    });
});
