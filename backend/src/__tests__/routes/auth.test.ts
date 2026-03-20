import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import request from 'supertest';

// ─── In-memory DB setup (via vi.hoisted so it's available to vi.mock) ───

const state = vi.hoisted(() => {
  return { db: null as import('better-sqlite3').Database | null };
});

vi.mock('../../db/index.js', () => ({
  getDb: () => state.db,
  closeDb: vi.fn(),
}));

// Import app AFTER mock is registered
import { app } from '../../app.js';

// ─── Test suite ─────────────────────────────────────────────────

describe('Auth API', () => {
  beforeAll(() => {
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

    // Seed admin user (low rounds for test speed)
    const hash = bcrypt.hashSync('admin123', 4);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(
      'admin',
      hash,
    );

    state.db = db;
  });

  afterAll(() => {
    state.db?.close();
    state.db = null;
  });

  // ── Login ───────────────────────────────────────────────────

  it('POST /api/auth/login with correct credentials → 200 + token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  it('POST /api/auth/login with wrong password → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/auth/login with missing fields → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin' }); // no password

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/auth/login with nonexistent user → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'password' });

    expect(res.status).toBe(401);
  });

  // ── Auth middleware ─────────────────────────────────────────

  it('GET /api/server/status without auth → 401', async () => {
    const res = await request(app).get('/api/server/status');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});
