/**
 * Express application setup — extracted from index.ts for testability.
 * This module creates and configures the Express app with all middleware
 * and routes but does NOT start the server or trigger side effects
 * (migrations, bridge, polling).
 */

import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import announcementsRouter from './routes/announcements.js';
import playersRouter from './routes/players.js';
import statusRouter from './routes/status.js';
import { authMiddleware } from './middleware/auth.js';
import { bridgeService } from './services/bridge.js';
import consoleRouter from './routes/console.js';
import pluginsRouter from './routes/plugins.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    bridge: bridgeService.getStatus(),
  });
});

app.use('/api/auth', authRouter);

app.use('/api', (req, res, next) => {
  // Skip auth for health and auth routes
  if (req.path === '/health' || req.path.startsWith('/auth')) {
    return next();
  }
  authMiddleware(req, res, next);
});

app.use('/api/server', statusRouter);
app.use('/api/console', consoleRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/players', playersRouter);
app.use('/api/plugins', pluginsRouter);

export { app };
