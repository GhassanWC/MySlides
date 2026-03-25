import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import { generateSlidesPayload, editSlidesPayload } from './services/openai';


admin.initializeApp();



const corsHandler = cors({
  origin: true,
  methods: ['OPTIONS', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

export const generateSlides = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB' as const,
    secrets: ['OPENAI_API_KEY'],
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to generate slides.');
    }
    const prompt = typeof data?.prompt === 'string' ? data.prompt.trim() : '';
    if (!prompt) throw new functions.https.HttpsError('invalid-argument', 'Prompt is required.');
    if (prompt.length > 8000) throw new functions.https.HttpsError('invalid-argument', 'Prompt is too long.');
    const modelName = typeof data?.modelName === 'string' ? data.modelName : 'gpt-4o-mini';
    try {
      const result = await generateSlidesPayload(prompt, modelName);
      return result;
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string; retryAfter?: number };
      if (e.code === 'resource-exhausted') {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Rate limit exceeded. Try again in ${e.retryAfter ?? 60} seconds.`,
          { retryAfter: e.retryAfter }
        );
      }
      if (e.code === 'failed-precondition') {
        throw new functions.https.HttpsError('failed-precondition', e.message ?? 'Not configured.');
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('rate limit') || msg.includes('429')) {
        throw new functions.https.HttpsError('resource-exhausted', 'OpenAI rate limit reached.', { retryAfter: 60 });
      }
      functions.logger.error('OpenAI error', err);
      throw new functions.https.HttpsError('internal', 'Failed to generate slides. Please try again.');
    }
  });

export const generateSlidesHttp = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB' as const,
    secrets: ['OPENAI_API_KEY'],
  })
  .region('us-central1')
  .https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed.' });
        return;
      }
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!token) {
        res.status(401).json({ error: 'Missing or invalid Authorization header.' });
        return;
      }
      try {
        await admin.auth().verifyIdToken(token);
      } catch {
        res.status(401).json({ error: 'Invalid or expired token.' });
        return;
      }
      const body = req.body as { prompt?: string; title?: string; modelName?: string };
      const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
      const modelName = typeof body?.modelName === 'string' ? body.modelName : 'gpt-4o-mini';
      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required.' });
        return;
      }
      if (prompt.length > 8000) {
        res.status(400).json({ error: 'Prompt is too long.' });
        return;
      }
      try {
        const result = await generateSlidesPayload(prompt, modelName);
        res.status(200).json(result);
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string; retryAfter?: number };
        if (e.code === 'resource-exhausted') {
          res.status(429).json({
            error: `Rate limit exceeded. Try again in ${e.retryAfter ?? 60} seconds.`,
            retryAfter: e.retryAfter,
          });
          return;
        }
        if (e.code === 'failed-precondition') {
          res.status(503).json({ error: e.message ?? 'Not configured.' });
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

export const editSlidesHttp = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB' as const,
    secrets: ['OPENAI_API_KEY'],
  })
  .region('us-central1')
  .https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed.' });
        return;
      }
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!token) {
        res.status(401).json({ error: 'Missing or invalid Authorization header.' });
        return;
      }
      try {
        await admin.auth().verifyIdToken(token);
      } catch {
        res.status(401).json({ error: 'Invalid or expired token.' });
        return;
      }
      const body = req.body as { request?: string; currentSlides?: any[]; selectedSlideId?: string; modelName?: string; availableAssets?: any[] };
      const requestText = typeof body?.request === 'string' ? body.request.trim() : '';
      const selectedSlideId = typeof body?.selectedSlideId === 'string' ? body.selectedSlideId : undefined;
      const modelName = typeof body?.modelName === 'string' ? body.modelName : 'gpt-4o-mini';
      const currentSlides = Array.isArray(body?.currentSlides) ? body.currentSlides : [];
      const availableAssets = Array.isArray(body?.availableAssets) ? body.availableAssets : [];

      if (!requestText) {
        res.status(400).json({ error: 'Request is required.' });
        return;
      }
      if (requestText.length > 8000) {
        res.status(400).json({ error: 'Request is too long.' });
        return;
      }
      try {
        const result = await editSlidesPayload(requestText, currentSlides, selectedSlideId, availableAssets, modelName);
        res.status(200).json(result);
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string; retryAfter?: number };
        if (e.code === 'resource-exhausted') {
          res.status(429).json({
            error: `Rate limit exceeded. Try again in ${e.retryAfter ?? 60} seconds.`,
            retryAfter: e.retryAfter,
          });
          return;
        }
        if (e.code === 'failed-precondition') {
          res.status(503).json({ error: e.message ?? 'Not configured.' });
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
