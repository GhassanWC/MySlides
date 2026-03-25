/**
 * Per-user API usage tracking for OpenAI rate limiting.
 * Resets on server restart. For production, use Redis or DB.
 */
const userUsage = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
export function checkRateLimit(userId) {
    const now = Date.now();
    let record = userUsage.get(userId);
    if (!record) {
        userUsage.set(userId, { count: 1, resetAt: now + WINDOW_MS });
        return { allowed: true };
    }
    if (now >= record.resetAt) {
        record = { count: 1, resetAt: now + WINDOW_MS };
        userUsage.set(userId, record);
        return { allowed: true };
    }
    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
    }
    record.count += 1;
    return { allowed: true };
}
