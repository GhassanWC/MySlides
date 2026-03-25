export function requireAuth(req, res, next) {
    const userId = req.session?.userId;
    if (!userId) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
    }
    next();
}
