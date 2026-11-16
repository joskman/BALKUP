import type { SQLiteDatabase } from 'expo-sqlite';

import { SEED_EXERCISES } from '@/domain/exercises';

// Lokalna SQLite baza (odluka T2). Svaki zapis ima UUID i vremena created/updated/deleted
// kako bi se u MVP-u mogao sinkronizirati sa serverom (offline-first, odluka C19).

export const DATABASE_NAME = 'balkup.db';
const DATABASE_VERSION = 1;

const SCHEMA_V1 = `
PRAGMA journal_mode = 'wal';

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY NOT NULL,
  name_en TEXT NOT NULL,
  name_hr TEXT NOT NULL,
  muscle TEXT NOT NULL,
  equipment TEXT NOT NULL,
  log_type TEXT NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  rest_sec INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS routine_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  planned_sets INTEGER NOT NULL DEFAULT 3,
  rest_sec INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  is_backfilled INTEGER NOT NULL DEFAULT 0,
  motivation INTEGER,
  note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY NOT NULL,
  workout_exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  weight_kg REAL,
  reps INTEGER,
  duration_sec INTEGER,
  distance_km REAL,
  confirmed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS xp_events (
  id TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL,
  amount INTEGER NOT NULL,
  workout_id TEXT,
  exercise_id TEXT,
  week_key TEXT,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY NOT NULL,
  item_id TEXT NOT NULL UNIQUE,
  unlocked_at INTEGER NOT NULL,
  equipped INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS weekly_progress (
  id TEXT PRIMARY KEY NOT NULL,
  week_key TEXT NOT NULL UNIQUE,
  goal INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_we_workout ON workout_exercises (workout_id);
CREATE INDEX IF NOT EXISTS idx_we_exercise ON workout_exercises (exercise_id);
CREATE INDEX IF NOT EXISTS idx_sets_we ON sets (workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_re_routine ON routine_exercises (routine_id);
`;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(SCHEMA_V1);
    version = 1;
  }
  // Buduće migracije: if (version < 2) { ... version = 2; }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  await seedExercises(db);
}

/** Dodaje vježbe iz biblioteke koje još ne postoje (sigurno pokretati više puta). */
async function seedExercises(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const e of SEED_EXERCISES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO exercises (id, name_en, name_hr, muscle, equipment, log_type, is_custom, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        e.id, e.nameEn, e.nameHr, e.muscle, e.equipment, e.logType, now, now,
      );
    }
  });
}
