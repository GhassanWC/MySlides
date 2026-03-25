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

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(session(sessionConfig));

app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use. Either:`);
    console.error(`  1. Stop the other process using port ${PORT}`);
    console.error(`  2. Or set PORT to another number (e.g. PORT=3002) in server/.env\n`);
    console.error(`Windows: to find and kill the process on port ${PORT}, run in PowerShell:`);
    console.error(`  Get-NetTCPConnection -LocalPort ${PORT} | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
