import type { SQLiteDatabase } from 'expo-sqlite';

import type { SetValues } from '@/domain/prefill';
import { prefillValues } from '@/domain/prefill';
import type {
  Equipment,
  Exercise,
  LogType,
  MuscleGroup,
  SetEntry,
  WorkoutEntry,
  WorkoutExerciseEntry,
  XpEventDraft,
} from '@/domain/types';
import { newId } from '@/lib/ids';

// Sav pristup bazi ide kroz ove funkcije. Brisanje je uvijek „meko“ (deleted_at),
// kako bi se kasnije moglo sinkronizirati.

// ---------- Postavke ----------

export interface Settings {
  weeklyGoal: number;
  defaultRestSec: number;
}

export const DEFAULT_SETTINGS: Settings = { weeklyGoal: 3, defaultRestSec: 90 };

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const s: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (r.key === 'weeklyGoal') s.weeklyGoal = Number(r.value);
    if (r.key === 'defaultRestSec') s.defaultRestSec = Number(r.value);
  }
  return s;
}

export async function setSetting(db: SQLiteDatabase, key: keyof Settings, value: number): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key, String(value), Date.now(),
  );
}

// ---------- Vježbe ----------

interface ExerciseRow {
  id: string;
  name_en: string;
  name_hr: string;
  muscle: string;
  equipment: string;
  log_type: string;
  is_custom: number;
  rest_sec: number | null;
}

export type ExerciseWithRest = Exercise & { restSec: number | null };

function mapExercise(r: ExerciseRow): ExerciseWithRest {
  return {
    id: r.id,
    nameEn: r.name_en,
    nameHr: r.name_hr,
    muscle: r.muscle as MuscleGroup,
    equipment: r.equipment as Equipment,
    logType: r.log_type as LogType,
    isCustom: r.is_custom === 1,
    restSec: r.rest_sec,
  };
}

export async function listExercises(db: SQLiteDatabase): Promise<ExerciseWithRest[]> {
  const rows = await db.getAllAsync<ExerciseRow>(
    'SELECT * FROM exercises WHERE deleted_at IS NULL ORDER BY name_en COLLATE NOCASE',
  );
  return rows.map(mapExercise);
}

export async function getExercise(db: SQLiteDatabase, id: string): Promise<ExerciseWithRest | null> {
  const r = await db.getFirstAsync<ExerciseRow>('SELECT * FROM exercises WHERE id = ?', id);
  return r ? mapExercise(r) : null;
}

export async function createCustomExercise(
  db: SQLiteDatabase,
  e: { nameEn: string; nameHr: string; muscle: MuscleGroup; equipment: Equipment; logType: LogType },
): Promise<string> {
  const id = newId();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO exercises (id, name_en, name_hr, muscle, equipment, log_type, is_custom, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    id, e.nameEn, e.nameHr, e.muscle, e.equipment, e.logType, now, now,
  );
  return id;
}

/** Pamti trajanje pauze za vježbu (odluka C9). */
export async function setExerciseRest(db: SQLiteDatabase, exerciseId: string, restSec: number): Promise<void> {
  await db.runAsync('UPDATE exercises SET rest_sec = ?, updated_at = ? WHERE id = ?', restSec, Date.now(), exerciseId);
}

// ---------- Rutine ----------

export interface RoutineItem {
  exerciseId: string;
  plannedSets: number;
  restSec: number | null;
}

export interface Routine {
  id: string;
  name: string;
  items: RoutineItem[];
}

export async function listRoutines(db: SQLiteDatabase): Promise<{ id: string; name: string; exerciseCount: number }[]> {
  return db.getAllAsync<{ id: string; name: string; exerciseCount: number }>(
    `SELECT r.id, r.name,
       (SELECT COUNT(*) FROM routine_exercises re WHERE re.routine_id = r.id AND re.deleted_at IS NULL) AS exerciseCount
     FROM routines r WHERE r.deleted_at IS NULL ORDER BY r.name COLLATE NOCASE`,
  );
}

export async function getRoutine(db: SQLiteDatabase, id: string): Promise<Routine | null> {
  const r = await db.getFirstAsync<{ id: string; name: string }>(
    'SELECT id, name FROM routines WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  if (!r) return null;
  const items = await db.getAllAsync<{ exercise_id: string; planned_sets: number; rest_sec: number | null }>(
    `SELECT exercise_id, planned_sets, rest_sec FROM routine_exercises
     WHERE routine_id = ? AND deleted_at IS NULL ORDER BY position`,
    id,
  );
  return {
    id: r.id,
    name: r.name,
    items: items.map((i) => ({ exerciseId: i.exercise_id, plannedSets: i.planned_sets, restSec: i.rest_sec })),
  };
}

export async function saveRoutine(
  db: SQLiteDatabase,
  routine: { id?: string; name: string; items: RoutineItem[] },
): Promise<string> {
  const now = Date.now();
  const id = routine.id ?? newId();
  await db.withTransactionAsync(async () => {
    if (routine.id) {
      await db.runAsync('UPDATE routines SET name = ?, updated_at = ? WHERE id = ?', routine.name, now, id);
      await db.runAsync(
        'UPDATE routine_exercises SET deleted_at = ?, updated_at = ? WHERE routine_id = ? AND deleted_at IS NULL',
        now, now, id,
      );
    } else {
      await db.runAsync('INSERT INTO routines (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', id, routine.name, now, now);
    }
    for (const [position, item] of routine.items.entries()) {
      await db.runAsync(
        `INSERT INTO routine_exercises (id, routine_id, exercise_id, position, planned_sets, rest_sec, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(), id, item.exerciseId, position, item.plannedSets, item.restSec, now, now,
      );
    }
  });
  return id;
}

export async function deleteRoutine(db: SQLiteDatabase, id: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE routines SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

// ---------- Treninzi ----------

export interface WorkoutDetail extends WorkoutEntry {
  routineId: string | null;
  motivation: number | null;
  note: string | null;
}

interface WorkoutRow {
  id: string;
  routine_id: string | null;
  started_at: number;
  ended_at: number | null;
  is_backfilled: number;
  motivation: number | null;
  note: string | null;
}

interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  completed_at: number | null;
}

interface SetRow {
  id: string;
  workout_exercise_id: string;
  position: number;
  weight_kg: number | null;
  reps: number | null;
  duration_sec: number | null;
  distance_km: number | null;
  confirmed_at: number | null;
}

function mapSet(r: SetRow): SetEntry {
  return {
    id: r.id,
    weightKg: r.weight_kg,
    reps: r.reps,
    durationSec: r.duration_sec,
    distanceKm: r.distance_km,
    confirmedAt: r.confirmed_at,
  };
}

function assemble(workouts: WorkoutRow[], wes: WorkoutExerciseRow[], sets: SetRow[]): WorkoutDetail[] {
  const setsByWe = new Map<string, SetEntry[]>();
  for (const s of [...sets].sort((a, b) => a.position - b.position)) {
    const list = setsByWe.get(s.workout_exercise_id) ?? [];
    list.push(mapSet(s));
    setsByWe.set(s.workout_exercise_id, list);
  }
  const wesByWorkout = new Map<string, WorkoutExerciseEntry[]>();
  for (const we of [...wes].sort((a, b) => a.position - b.position)) {
    const list = wesByWorkout.get(we.workout_id) ?? [];
    list.push({
      id: we.id,
      exerciseId: we.exercise_id,
      position: we.position,
      completedAt: we.completed_at,
      sets: setsByWe.get(we.id) ?? [],
    });
    wesByWorkout.set(we.workout_id, list);
  }
  return workouts.map((w) => ({
    id: w.id,
    routineId: w.routine_id,
    startedAt: w.started_at,
    endedAt: w.ended_at,
    isBackfilled: w.is_backfilled === 1,
    motivation: w.motivation,
    note: w.note,
    exercises: wesByWorkout.get(w.id) ?? [],
  }));
}

export async function loadWorkout(db: SQLiteDatabase, id: string): Promise<WorkoutDetail | null> {
  const w = await db.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ? AND deleted_at IS NULL', id);
  if (!w) return null;
  const wes = await db.getAllAsync<WorkoutExerciseRow>(
    'SELECT * FROM workout_exercises WHERE workout_id = ? AND deleted_at IS NULL',
    id,
  );
  const sets = await db.getAllAsync<SetRow>(
    `SELECT s.* FROM sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id
     WHERE we.workout_id = ? AND we.deleted_at IS NULL AND s.deleted_at IS NULL`,
    id,
  );
  return assemble([w], wes, sets)[0];
}

/** Svi treninzi (za XP motor i izvoz). */
export async function loadAllWorkouts(db: SQLiteDatabase): Promise<WorkoutDetail[]> {
  const ws = await db.getAllAsync<WorkoutRow>('SELECT * FROM workouts WHERE deleted_at IS NULL');
  const wes = await db.getAllAsync<WorkoutExerciseRow>('SELECT * FROM workout_exercises WHERE deleted_at IS NULL');
  const sets = await db.getAllAsync<SetRow>('SELECT * FROM sets WHERE deleted_at IS NULL');
  return assemble(ws, wes, sets);
}

/** Aktivni trening uživo (naknadni unosi se ne računaju). */
export async function getActiveWorkout(
  db: SQLiteDatabase,
): Promise<{ id: string; startedAt: number; lastSetAt: number | null } | null> {
  const w = await db.getFirstAsync<{ id: string; started_at: number }>(
    `SELECT id, started_at FROM workouts
     WHERE ended_at IS NULL AND is_backfilled = 0 AND deleted_at IS NULL
     ORDER BY started_at DESC LIMIT 1`,
  );
  if (!w) return null;
  const last = await db.getFirstAsync<{ last: number | null }>(
    `SELECT MAX(s.confirmed_at) AS last FROM sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id
     WHERE we.workout_id = ? AND we.deleted_at IS NULL AND s.deleted_at IS NULL`,
    w.id,
  );
  return { id: w.id, startedAt: w.started_at, lastSetAt: last?.last ?? null };
}

/** Potvrđene serije vježbe sa zadnjeg završenog treninga (za „prošli put“ i popunjavanje). */
export async function lastSetsForExercise(
  db: SQLiteDatabase,
  exerciseId: string,
  excludeWorkoutId?: string,
): Promise<SetValues[]> {
  const we = await db.getFirstAsync<{ id: string }>(
    `SELECT we.id FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND we.deleted_at IS NULL AND w.deleted_at IS NULL
       AND w.ended_at IS NOT NULL AND w.id != ?
       AND EXISTS (SELECT 1 FROM sets s WHERE s.workout_exercise_id = we.id AND s.confirmed_at IS NOT NULL AND s.deleted_at IS NULL)
     ORDER BY w.started_at DESC LIMIT 1`,
    exerciseId, excludeWorkoutId ?? '',
  );
  if (!we) return [];
  const rows = await db.getAllAsync<SetRow>(
    `SELECT * FROM sets WHERE workout_exercise_id = ? AND confirmed_at IS NOT NULL AND deleted_at IS NULL ORDER BY position`,
    we.id,
  );
  return rows.map((r) => ({ weightKg: r.weight_kg, reps: r.reps, durationSec: r.duration_sec, distanceKm: r.distance_km }));
}

export async function startWorkout(
  db: SQLiteDatabase,
  opts: { routineId?: string; backfillStartedAt?: number } = {},
): Promise<string> {
  const id = newId();
  const now = Date.now();
  const startedAt = opts.backfillStartedAt ?? now;
  await db.runAsync(
    `INSERT INTO workouts (id, routine_id, started_at, is_backfilled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    id, opts.routineId ?? null, startedAt, opts.backfillStartedAt != null ? 1 : 0, now, now,
  );
  if (opts.routineId) {
    const routine = await getRoutine(db, opts.routineId);
    for (const item of routine?.items ?? []) {
      // Pauza zadana u rutini postaje zapamćena pauza vježbe.
      if (item.restSec != null) await setExerciseRest(db, item.exerciseId, item.restSec);
      await addExerciseToWorkout(db, id, item.exerciseId, item.plannedSets);
    }
  }
  return id;
}

/** Dodaje vježbu u trening s `plannedSets` nepotvrđenih, unaprijed popunjenih serija. */
export async function addExerciseToWorkout(
  db: SQLiteDatabase,
  workoutId: string,
  exerciseId: string,
  plannedSets = 1,
): Promise<string> {
  const now = Date.now();
  const id = newId();
  const pos = await db.getFirstAsync<{ n: number }>(
    'SELECT COALESCE(MAX(position) + 1, 0) AS n FROM workout_exercises WHERE workout_id = ?',
    workoutId,
  );
  await db.runAsync(
    `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    id, workoutId, exerciseId, pos?.n ?? 0, now, now,
  );
  const last = await lastSetsForExercise(db, exerciseId, workoutId);
  const first = prefillValues(0, null, last);
  for (let i = 0; i < Math.max(1, plannedSets); i++) {
    // Sve planirane serije kreću s vrijednostima prve; nakon potvrde se sljedeća puni iz prethodne.
    await insertSet(db, id, i, first);
  }
  return id;
}

async function insertSet(db: SQLiteDatabase, workoutExerciseId: string, position: number, v: SetValues): Promise<string> {
  const id = newId();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO sets (id, workout_exercise_id, position, weight_kg, reps, duration_sec, distance_km, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, workoutExerciseId, position, v.weightKg, v.reps, v.durationSec, v.distanceKm, now, now,
  );
  return id;
}

export async function addSet(db: SQLiteDatabase, workoutExerciseId: string, v: SetValues): Promise<string> {
  const pos = await db.getFirstAsync<{ n: number }>(
    'SELECT COALESCE(MAX(position) + 1, 0) AS n FROM sets WHERE workout_exercise_id = ?',
    workoutExerciseId,
  );
  return insertSet(db, workoutExerciseId, pos?.n ?? 0, v);
}

export async function updateSetValues(db: SQLiteDatabase, setId: string, v: SetValues): Promise<void> {
  await db.runAsync(
    'UPDATE sets SET weight_kg = ?, reps = ?, duration_sec = ?, distance_km = ?, updated_at = ? WHERE id = ?',
    v.weightKg, v.reps, v.durationSec, v.distanceKm, Date.now(), setId,
  );
}

export async function setConfirmed(db: SQLiteDatabase, setId: string, confirmedAt: number | null): Promise<void> {
  await db.runAsync('UPDATE sets SET confirmed_at = ?, updated_at = ? WHERE id = ?', confirmedAt, Date.now(), setId);
}

export async function deleteSet(db: SQLiteDatabase, setId: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE sets SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, setId);
}

export async function removeWorkoutExercise(db: SQLiteDatabase, workoutExerciseId: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE workout_exercises SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, workoutExerciseId);
}

export async function setExerciseCompleted(db: SQLiteDatabase, workoutExerciseId: string, at: number | null): Promise<void> {
  await db.runAsync(
    'UPDATE workout_exercises SET completed_at = ?, updated_at = ? WHERE id = ?',
    at, Date.now(), workoutExerciseId,
  );
}

export async function finishWorkout(db: SQLiteDatabase, workoutId: string, endedAt: number): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE workouts SET ended_at = ?, updated_at = ? WHERE id = ?', endedAt, now, workoutId);
    await db.runAsync(
      `UPDATE workout_exercises SET completed_at = ?, updated_at = ?
       WHERE workout_id = ? AND completed_at IS NULL AND deleted_at IS NULL`,
      endedAt, now, workoutId,
    );
    // Nepotvrđene serije nisu odrađene i ne ulaze u povijest.
    await db.runAsync(
      `UPDATE sets SET deleted_at = ?, updated_at = ? WHERE confirmed_at IS NULL AND deleted_at IS NULL
       AND workout_exercise_id IN (SELECT id FROM workout_exercises WHERE workout_id = ?)`,
      now, now, workoutId,
    );
    // Vježbe bez ijedne potvrđene serije uklanjaju se iz završenog treninga.
    await db.runAsync(
      `UPDATE workout_exercises SET deleted_at = ?, updated_at = ?
       WHERE workout_id = ? AND deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM sets s WHERE s.workout_exercise_id = workout_exercises.id AND s.deleted_at IS NULL)`,
      now, now, workoutId,
    );
  });
}

/** Odbacivanje ili brisanje treninga (meko brisanje). */
export async function deleteWorkout(db: SQLiteDatabase, workoutId: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE workouts SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, workoutId);
}

/** Briše nedovršene nacrte naknadnog unosa. */
export async function discardBackfillDrafts(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    'UPDATE workouts SET deleted_at = ?, updated_at = ? WHERE is_backfilled = 1 AND ended_at IS NULL AND deleted_at IS NULL',
    now, now,
  );
}

export async function setWorkoutFeedback(
  db: SQLiteDatabase,
  workoutId: string,
  motivation: number | null,
  note: string | null,
): Promise<void> {
  await db.runAsync(
    'UPDATE workouts SET motivation = ?, note = ?, updated_at = ? WHERE id = ?',
    motivation, note, Date.now(), workoutId,
  );
}

export interface WorkoutListItem {
  id: string;
  startedAt: number;
  endedAt: number;
  isBackfilled: boolean;
  motivation: number | null;
  exerciseCount: number;
  setCount: number;
}

export async function listFinishedWorkouts(db: SQLiteDatabase): Promise<WorkoutListItem[]> {
  const rows = await db.getAllAsync<{
    id: string;
    started_at: number;
    ended_at: number;
    is_backfilled: number;
    motivation: number | null;
    exerciseCount: number;
    setCount: number;
  }>(
    `SELECT w.id, w.started_at, w.ended_at, w.is_backfilled, w.motivation,
       (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id AND we.deleted_at IS NULL) AS exerciseCount,
       (SELECT COUNT(*) FROM sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id
          WHERE we.workout_id = w.id AND we.deleted_at IS NULL AND s.deleted_at IS NULL AND s.confirmed_at IS NOT NULL) AS setCount
     FROM workouts w WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL ORDER BY w.started_at DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    isBackfilled: r.is_backfilled === 1,
    motivation: r.motivation,
    exerciseCount: r.exerciseCount,
    setCount: r.setCount,
  }));
}

export async function exerciseHistory(
  db: SQLiteDatabase,
  exerciseId: string,
): Promise<{ workoutId: string; startedAt: number; sets: SetValues[] }[]> {
  const rows = await db.getAllAsync<SetRow & { workout_id: string; started_at: number }>(
    `SELECT s.*, w.id AS workout_id, w.started_at FROM sets s
     JOIN workout_exercises we ON we.id = s.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND s.confirmed_at IS NOT NULL AND s.deleted_at IS NULL
       AND we.deleted_at IS NULL AND w.deleted_at IS NULL AND w.ended_at IS NOT NULL
     ORDER BY w.started_at DESC, s.position`,
    exerciseId,
  );
  const out: { workoutId: string; startedAt: number; sets: SetValues[] }[] = [];
  for (const r of rows) {
    let group = out[out.length - 1];
    if (!group || group.workoutId !== r.workout_id) {
      group = { workoutId: r.workout_id, startedAt: r.started_at, sets: [] };
      out.push(group);
    }
    group.sets.push({ weightKg: r.weight_kg, reps: r.reps, durationSec: r.duration_sec, distanceKm: r.distance_km });
  }
  return out;
}

// ---------- Tjedni cilj ----------

export async function getWeekGoals(db: SQLiteDatabase): Promise<Map<string, number>> {
  const rows = await db.getAllAsync<{ week_key: string; goal: number }>(
    'SELECT week_key, goal FROM weekly_progress WHERE deleted_at IS NULL',
  );
  return new Map(rows.map((r) => [r.week_key, r.goal]));
}

/** Sprema cilj za tjedan. `overwrite = false` samo stvara snimku ako je nema. */
export async function saveWeekGoal(db: SQLiteDatabase, weekKey: string, goal: number, overwrite: boolean): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO weekly_progress (id, week_key, goal, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(week_key) DO ${overwrite ? 'UPDATE SET goal = excluded.goal, updated_at = excluded.updated_at' : 'NOTHING'}`,
    newId(), weekKey, goal, now, now,
  );
}

// ---------- XP i inventar ----------

export async function replaceXpEvents(db: SQLiteDatabase, events: XpEventDraft[]): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM xp_events');
    for (const e of events) {
      await db.runAsync(
        `INSERT INTO xp_events (id, source, amount, workout_id, exercise_id, week_key, reason, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(), e.source, e.amount, e.workoutId, e.exerciseId, e.weekKey, e.reason, now, now,
      );
    }
  });
}

export interface InventoryRow {
  itemId: string;
  unlockedAt: number;
  equipped: boolean;
}

export async function getInventory(db: SQLiteDatabase): Promise<InventoryRow[]> {
  const rows = await db.getAllAsync<{ item_id: string; unlocked_at: number; equipped: number }>(
    'SELECT item_id, unlocked_at, equipped FROM inventory_items WHERE deleted_at IS NULL',
  );
  return rows.map((r) => ({ itemId: r.item_id, unlockedAt: r.unlocked_at, equipped: r.equipped === 1 }));
}

export async function unlockItems(db: SQLiteDatabase, itemIds: string[]): Promise<void> {
  const now = Date.now();
  for (const itemId of itemIds) {
    await db.runAsync(
      `INSERT OR IGNORE INTO inventory_items (id, item_id, unlocked_at, equipped, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
      newId(), itemId, now, now, now,
    );
  }
}

/** Oprema predmet; ostali predmeti u istom slotu se skidaju. */
export async function setEquipped(
  db: SQLiteDatabase,
  itemId: string,
  equipped: boolean,
  sameSlotItemIds: string[],
): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    if (equipped) {
      for (const other of sameSlotItemIds) {
        await db.runAsync('UPDATE inventory_items SET equipped = 0, updated_at = ? WHERE item_id = ?', now, other);
      }
    }
    await db.runAsync('UPDATE inventory_items SET equipped = ?, updated_at = ? WHERE item_id = ?', equipped ? 1 : 0, now, itemId);
  });
}

// ---------- Izvoz ----------

export async function exportAllTables(db: SQLiteDatabase): Promise<Record<string, unknown[]>> {
  const tables = [
    'exercises',
    'routines',
    'routine_exercises',
    'workouts',
    'workout_exercises',
    'sets',
    'xp_events',
    'inventory_items',
    'weekly_progress',
    'settings',
  ];
  const out: Record<string, unknown[]> = {};
  for (const t of tables) out[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  return out;
}
