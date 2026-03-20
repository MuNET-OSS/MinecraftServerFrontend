import bcrypt from 'bcrypt';
import { getDb } from './index.js';

export function seedAdmin(): void {
  const db = getDb();

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

  if (existing) {
    console.log('Admin user already exists, skipping seed');
    return;
  }

  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  Using default admin credentials. Change via ADMIN_USERNAME/ADMIN_PASSWORD env vars.');
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
  console.log('Admin user seeded successfully');
}
