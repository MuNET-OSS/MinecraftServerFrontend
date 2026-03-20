import type Database from 'better-sqlite3';
import { getDb } from './index.js';
import { migration001 } from './migrations/001-init.js';

type MigrationFn = (db: Database.Database) => void;

const migrations: MigrationFn[] = [
  migration001,
];

export function runMigrations(): void {
  const db = getDb();
  const currentVersion = (db.pragma('user_version', { simple: true }) as number);

  console.log(`Database at version ${currentVersion}, ${migrations.length} migrations available`);

  if (currentVersion >= migrations.length) {
    console.log('Database is up to date');
    return;
  }

  const runAll = db.transaction(() => {
    for (let i = currentVersion; i < migrations.length; i++) {
      console.log(`Running migration ${i + 1}...`);
      migrations[i](db);
      db.pragma(`user_version = ${i + 1}`);
      console.log(`Migration ${i + 1} complete`);
    }
  });

  runAll();
  console.log('All migrations complete');
}
