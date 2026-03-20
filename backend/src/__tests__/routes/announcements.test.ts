import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import request from 'supertest';

// ─── In-memory DB setup ─────────────────────────────────────────

const state = vi.hoisted(() => {
  return { db: null as import('better-sqlite3').Database | null };
});

vi.mock('../../db/index.js', () => ({
  getDb: () => state.db,
  closeDb: vi.fn(),
}));

import { app } from '../../app.js';

// ─── Helpers ────────────────────────────────────────────────────

/** Login as admin and return the JWT token. */
async function getToken(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  return res.body.token as string;
}

// ─── Test suite ─────────────────────────────────────────────────

describe('Announcements API', () => {
  let token: string;

  beforeAll(async () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_pinned INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    const hash = bcrypt.hashSync('admin123', 4);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(
      'admin',
      hash,
    );

    state.db = db;
    token = await getToken();
  });

  beforeEach(() => {
    // Clear announcements between tests
    state.db!.prepare('DELETE FROM announcements').run();
  });

  afterAll(() => {
    state.db?.close();
    state.db = null;
  });

  // ── Auth guard ──────────────────────────────────────────────

  it('GET /api/announcements without auth → 401', async () => {
    const res = await request(app).get('/api/announcements');
    expect(res.status).toBe(401);
  });

  // ── CRUD ────────────────────────────────────────────────────

  it('POST → GET → PUT → DELETE full lifecycle', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Title', content: 'Test Content', is_pinned: 0 });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty('id');
    expect(createRes.body.title).toBe('Test Title');

    const id = createRes.body.id;

    // Read
    const listRes = await request(app)
      .get('/api/announcements')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.announcements).toHaveLength(1);
    expect(listRes.body.total).toBe(1);

    // Update
    const updateRes = await request(app)
      .put(`/api/announcements/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('Updated Title');

    // Delete
    const deleteRes = await request(app)
      .delete(`/api/announcements/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify gone
    const afterDelete = await request(app)
      .get('/api/announcements')
      .set('Authorization', `Bearer ${token}`);

    expect(afterDelete.body.announcements).toHaveLength(0);
  });

  it('POST with empty title → 400', async () => {
    const res = await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '', content: 'Some content' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST with missing content → 400', async () => {
    const res = await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Title Only' });

    expect(res.status).toBe(400);
  });

  it('DELETE nonexistent announcement → 404', async () => {
    const res = await request(app)
      .delete('/api/announcements/99999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
