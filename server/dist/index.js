import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { authRouter } from './routes/auth.js';
import { apiRouter } from './routes/api.js';
import { sessionConfig } from './config/session.js';
const app = express();
const PORT = process.env.PORT ?? 3001;
app.use(cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(session(sessionConfig));
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);
app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
