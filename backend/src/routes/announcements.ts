import { Router } from 'express';
import { getDb } from '../db/index.js';
import { bridgeService } from '../services/bridge.js';

const router = Router();

interface Announcement {
  id: number;
  title: string;
  content: string;
  is_pinned: number;
  created_at: string;
  updated_at: string;
}

// GET / - List announcements with pagination
router.get('/', (req, res) => {
  const db = getDb();
  const page = parseInt(req.query['page'] as string) || 1;
  const limit = parseInt(req.query['limit'] as string) || 10;
  const offset = (page - 1) * limit;

  const announcements = db.prepare(
    'SELECT * FROM announcements ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset) as Announcement[];

  const countResult = db.prepare('SELECT COUNT(*) as total FROM announcements').get() as { total: number };
  const total = countResult.total;

  res.json({ announcements, total, page, limit });
});

// POST / - Create announcement
router.post('/', (req, res) => {
  const { title, content, is_pinned } = req.body as { title?: string; content?: string; is_pinned?: number };

  if (!title || typeof title !== 'string' || title.trim() === '' ||
      !content || typeof content !== 'string' || content.trim() === '') {
    res.status(400).json({ error: '标题和内容不能为空' });
    return;
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO announcements (title, content, is_pinned) VALUES (?, ?, ?)'
  ).run(title.trim(), content.trim(), is_pinned ? 1 : 0);

  const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid) as Announcement;
  res.status(201).json(announcement);
});

// PUT /:id - Update announcement
router.put('/:id', (req, res) => {
  const id = parseInt(req.params['id']);
  const db = getDb();

  const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as Announcement | undefined;
  if (!existing) {
    res.status(404).json({ error: '公告不存在' });
    return;
  }

  const { title, content, is_pinned } = req.body as { title?: string; content?: string; is_pinned?: number };

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }
  if (content !== undefined) {
    updates.push('content = ?');
    values.push(content);
  }
  if (is_pinned !== undefined) {
    updates.push('is_pinned = ?');
    values.push(is_pinned ? 1 : 0);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as Announcement;
  res.json(updated);
});

// DELETE /:id - Delete announcement
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params['id']);
  const db = getDb();

  const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as Announcement | undefined;
  if (!existing) {
    res.status(404).json({ error: '公告不存在' });
    return;
  }

  db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  res.json({ success: true });
});

// POST /:id/broadcast - Broadcast announcement to game
router.post('/:id/broadcast', async (req, res) => {
  const id = parseInt(req.params['id']);
  const db = getDb();

  const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as Announcement | undefined;
  if (!announcement) {
    res.status(404).json({ error: '公告不存在' });
    return;
  }

  const status = bridgeService.getStatus();
  if (status !== 'connected') {
    res.status(503).json({ error: 'Bridge 未连接，无法推送' });
    return;
  }

  const { color = 'white', mode = 'chat' } = req.body as { color?: string; mode?: string };

  try {
    if (mode === 'title') {
      // Use /title command — show title + subtitle
      const titleJson = JSON.stringify({ text: announcement.title, color });
      const subtitleJson = JSON.stringify({ text: announcement.content, color });
      await bridgeService.sendCommand(`title @a subtitle ${subtitleJson}`);
      await bridgeService.sendCommand(`title @a title ${titleJson}`);
    } else {
      // Default: tellraw in chat
      const tellrawJson = JSON.stringify([
        { text: '[公告] ', color: 'gold', bold: true },
        { text: `${announcement.title}: `, color, bold: true },
        { text: announcement.content, color }
      ]);
      await bridgeService.sendCommand(`tellraw @a ${tellrawJson}`);
    }
    res.json({ success: true, message: '已推送到游戏内' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `推送失败: ${message}` });
  }
});

export default router;
