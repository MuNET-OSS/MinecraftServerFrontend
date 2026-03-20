/**
 * External API — API Key authenticated endpoints for AI tools / automation.
 *
 * Auth: Header `Authorization: Bearer <EXTERNAL_API_KEY>`
 *
 * Endpoints:
 *   GET  /api/external/status   — server status (TPS, memory, CPU, players, mspt)
 *   POST /api/external/command  — execute MC command  { "command": "say hello" }
 *   GET  /api/external/players  — online player list
 */

import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { bridgeService } from '../services/bridge.js';
import { getCachedStatus } from '../services/status.js';

const router = Router();

// API Key auth middleware
function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.externalApiKey) {
    res.status(503).json({ error: 'External API is not configured. Set EXTERNAL_API_KEY env var.' });
    return;
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header. Use: Bearer <API_KEY>' });
    return;
  }

  const key = auth.slice(7);
  if (key !== config.externalApiKey) {
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  next();
}

router.use(apiKeyAuth);

// GET /api/external/status
router.get('/status', (_req: Request, res: Response) => {
  const status = getCachedStatus();
  res.json({
    bridge: bridgeService.getStatus(),
    tps: status.tps ?? null,
    memory: status.memory ?? null,
    cpu: status.cpu ?? null,
    players: status.players ?? null,
    mspt: status.mspt ?? null,
  });
});

// POST /api/external/command
router.post('/command', async (req: Request, res: Response) => {
  const { command } = req.body as { command?: string };

  if (!command || typeof command !== 'string') {
    res.status(400).json({ error: 'Missing "command" field' });
    return;
  }

  if (bridgeService.getStatus() !== 'connected') {
    res.status(503).json({ error: 'Bridge not connected to MC server' });
    return;
  }

  try {
    const result = await bridgeService.sendCommand(command);
    res.json({ success: true, result: result.result });
  } catch {
    res.status(500).json({ error: 'Command execution failed' });
  }
});

// GET /api/external/players
router.get('/players', (_req: Request, res: Response) => {
  const status = getCachedStatus();
  if (!status.players) {
    res.status(503).json({ error: 'Player data not available' });
    return;
  }
  res.json({
    online: status.players.online,
    max: status.players.max,
    list: status.players.list,
  });
});

export default router;
