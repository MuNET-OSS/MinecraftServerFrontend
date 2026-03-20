import { Router, Request, Response } from 'express';
import { bridgeService } from '../services/bridge.js';
import { getCachedStatus } from '../services/status.js';

const router = Router();

// GET /api/players — uses cached status from bridge (instant, no latency)
router.get('/', async (_req: Request, res: Response) => {
  const status = getCachedStatus();

  if (bridgeService.getStatus() !== 'connected' || !status.players) {
    res.status(503).json({ error: 'Bridge 未连接' });
    return;
  }

  res.json({
    online: status.players.online,
    max: status.players.max,
    players: status.players.list.map((name) => ({ name })),
  });
});

// POST /api/players/:name/kick
router.post('/:name/kick', async (req: Request, res: Response) => {
  if (bridgeService.getStatus() !== 'connected') {
    res.status(503).json({ error: 'Bridge 未连接' });
    return;
  }

  const name = req.params.name;
  const { reason } = req.body as { reason?: string };
  const command = reason ? `kick ${name} ${reason}` : `kick ${name}`;

  try {
    const result = await bridgeService.sendCommand(command);
    res.json({
      success: true,
      message: `已踢出玩家 ${name}`,
      result: result.result,
    });
  } catch {
    res.status(503).json({ error: 'Bridge 未连接' });
  }
});

// POST /api/players/:name/ban
router.post('/:name/ban', async (req: Request, res: Response) => {
  if (bridgeService.getStatus() !== 'connected') {
    res.status(503).json({ error: 'Bridge 未连接' });
    return;
  }

  const name = req.params.name;
  const { reason } = req.body as { reason?: string };
  const command = reason ? `ban ${name} ${reason}` : `ban ${name}`;

  try {
    const result = await bridgeService.sendCommand(command);
    res.json({
      success: true,
      message: `已封禁玩家 ${name}`,
      result: result.result,
    });
  } catch {
    res.status(503).json({ error: 'Bridge 未连接' });
  }
});

export default router;
