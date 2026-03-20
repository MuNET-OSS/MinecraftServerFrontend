import { Router } from 'express';
import { getCachedStatus } from '../services/status.js';
import { bridgeService } from '../services/bridge.js';
import { getLatestUptime, getUptimeHistory } from '../services/uptime.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(getCachedStatus());
});

// POST /api/server/restart - Restart the MC server
router.post('/restart', async (_req, res) => {
  if (bridgeService.getStatus() !== 'connected') {
    res.status(503).json({ error: 'Bridge 未连接' });
    return;
  }

  try {
    await bridgeService.sendCommand('restart');
    res.json({ success: true, message: '服务器正在重启...' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `重启失败: ${message}` });
  }
});

// GET /api/server/commands - Get all registered MC commands
router.get('/commands', async (_req, res) => {
  if (bridgeService.getStatus() !== 'connected') {
    res.status(503).json({ error: 'Bridge 未连接' });
    return;
  }

  try {
    const commands = await bridgeService.getCommands();
    res.json({ commands });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// POST /api/server/tabcomplete - Server-side tab completion
router.post('/tabcomplete', async (req, res) => {
  if (bridgeService.getStatus() !== 'connected') {
    res.status(503).json({ suggestions: [] });
    return;
  }

  const { input } = req.body as { input?: string };
  if (!input || typeof input !== 'string') {
    res.json({ suggestions: [] });
    return;
  }

  try {
    const suggestions = await bridgeService.tabComplete(input);
    res.json({ suggestions });
  } catch {
    res.json({ suggestions: [] });
  }
});

// GET /api/server/uptime - Get latest Uptime Kuma monitor snapshot
router.get('/uptime', (_req, res) => {
  res.json({ monitors: getLatestUptime() });
});

// GET /api/server/uptime/history - Get cached history for chart rendering
router.get('/uptime/history', (_req, res) => {
  res.json({ history: getUptimeHistory() });
});

export default router;
