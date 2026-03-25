import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/requireAuth.js';
import { generateSlides } from '../services/openai.js';
import { checkRateLimit } from '../services/rateLimit.js';
const router = Router();
/** General API rate limit (per IP) */
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many requests. Please try again later.' },
});
router.use(apiLimiter);
/**
 * POST /api/generate
 * Body: { prompt: string }
 * Requires auth. Uses per-user rate limit for OpenAI.
 */
router.post('/generate', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const limit = checkRateLimit(userId);
        if (!limit.allowed) {
            return res.status(429).json({
                error: 'Rate limit exceeded. Too many slide generations.',
                retryAfter: limit.retryAfter,
            });
        }
        const { prompt } = req.body ?? {};
        const text = typeof prompt === 'string' ? prompt.trim() : '';
        if (!text) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }
        if (text.length > 8000) {
            return res.status(400).json({ error: 'Prompt is too long.' });
        }
        const slides = await generateSlides(text);
        return res.json({ slides });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('OPENAI_API_KEY')) {
            return res.status(503).json({
                error: 'Slide generation is not configured. Please set OPENAI_API_KEY.',
            });
        }
        if (message.includes('rate limit') || message.includes('429')) {
            return res.status(429).json({
                error: 'OpenAI rate limit reached. Please wait a moment and try again.',
                retryAfter: 60,
            });
        }
        console.error('Generate error:', err);
        return res.status(500).json({
            error: 'Failed to generate slides. Please try again.',
        });
    }
});
export const apiRouter = router;
