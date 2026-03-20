import { Router, Request, Response } from 'express';
import { bridgeService } from '../services/bridge.js';
import { getIo } from '../services/socket.js';

const router = Router();

router.post('/execute', async (req: Request, res: Response): Promise<void> => {
  const { command } = req.body as { command?: string };

  if (!command || typeof command !== 'string' || command.trim().length === 0) {
    res.status(400).json({ error: '命令不能为空' });
    return;
  }

  if (bridgeService.getStatus() !== 'connected') {
    res.status(503).json({ error: 'Bridge 未连接' });
    return;
  }

  const timestamp = new Date().toISOString();

  try {
    const result = await bridgeService.sendCommand(command.trim());

    const io = getIo();
    io.emit('console:command', { command: command.trim(), timestamp });
    io.emit('console:response', { command: command.trim(), result: result.result, timestamp });

    res.json({ result: result.result, timestamp });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
