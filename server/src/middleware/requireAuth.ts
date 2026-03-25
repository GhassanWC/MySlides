import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  let userId = req.session?.userId;
  const authHeader = req.headers.authorization;
  if (!userId && authHeader?.startsWith('Bearer ')) {
    userId = 'firebase-user'; // Mock for now so client can hit server
    if (!req.session) (req as any).session = {};
    req.session.userId = userId;
  }

  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  next();
}
