import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../store/users.js';

const SALT_ROUNDS = 12;
const router = Router();

/** Email format validation */
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test((email ?? '').trim());
}

/** Password strength: min 8 chars, at least one letter and one number */
function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[a-zA-Z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  return true;
}

/**
 * POST /api/auth/register
 * Body: { email, password, confirmPassword }
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, confirmPassword } = req.body ?? {};
    if (!email || !password || confirmPassword === undefined) {
      return res.status(400).json({ error: 'Email, password, and confirm password are required.' });
    }
    const trimmedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and contain both letters and numbers.',
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Password and confirmation do not match.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = createUser(trimmedEmail, passwordHash);

    return res.status(201).json({
      user: { id: user.id, email: user.email },
      message: 'Registration successful. Please log in.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed.';
    if (message === 'User already exists') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const trimmedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    const user = findUserByEmail(trimmedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    req.session.userId = user.id;
    req.session.email = user.email;

    return res.json({
      user: { id: user.id, email: user.email },
      message: 'Login successful.',
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed.' });
    }
    res.clearCookie('myslides.sid');
    return res.json({ message: 'Logged out.' });
  });
});

/**
 * GET /api/auth/me
 */
router.get('/me', (req: Request, res: Response) => {
  const userId = req.session?.userId;
  const email = req.session?.email;
  if (!userId || !email) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  return res.json({ user: { id: userId, email } });
});

export const authRouter = router;
