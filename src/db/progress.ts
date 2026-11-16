import type { SQLiteDatabase } from 'expo-sqlite';

import type { ItemDef } from '@/domain/items';
import { itemsUnlockedAt } from '@/domain/items';
import type { LevelInfo } from '@/domain/levels';
import { levelFromXp } from '@/domain/levels';
import type { Exercise } from '@/domain/types';
import { weekKey } from '@/domain/weeks';
import type { ReplayResult, WeekProgress } from '@/domain/xp';
import { computeStreak, replayHistory } from '@/domain/xp';

import type { InventoryRow, Settings } from './repo';
import {
  deleteWorkout,
  finishWorkout,
  getActiveWorkout,
  getInventory,
  getSettings,
  getWeekGoals,
  listExercises,
  loadAllWorkouts,
  replaceXpEvents,
  saveWeekGoal,
  unlockItems,
} from './repo';

export interface Progress {
  replay: ReplayResult;
  level: LevelInfo;
  totalXp: number;
  streak: number;
  currentWeek: WeekProgress | undefined;
  currentWeekKey: string;
  weeklyGoal: number;
  settings: Settings;
  inventory: InventoryRow[];
  exMap: Map<string, Exercise>;
  /** Predmeti otključani u ovom izračunu (za proslavu). */
  newlyUnlocked: ItemDef[];
}

/**
 * Izračunava napredak iz cijele povijesti. Uz `persist` sprema XP događaje
 * i otključava nove predmete (otključan predmet se nikad ne oduzima, „nema kazni“).
 */
export async function computeProgress(db: SQLiteDatabase, opts: { persist?: boolean } = {}): Promise<Progress> {
  const [workouts, exercises, settings, weekGoals] = await Promise.all([
    loadAllWorkouts(db),
    listExercises(db),
    getSettings(db),
    getWeekGoals(db),
  ]);
  const exMap = new Map<string, Exercise>(exercises.map((e) => [e.id, e]));
  const currentWeekKey = weekKey(Date.now());
  const goalForWeek = (wk: string) => weekGoals.get(wk) ?? settings.weeklyGoal;

  const replay = replayHistory(workouts, exMap, goalForWeek);
  const level = levelFromXp(replay.totalXp);

  let inventory = await getInventory(db);
  let newlyUnlocked: ItemDef[] = [];
  if (opts.persist) {
    await replaceXpEvents(db, replay.events);
    const owned = new Set(inventory.map((i) => i.itemId));
    newlyUnlocked = itemsUnlockedAt(level.level).filter((i) => !owned.has(i.id));
    if (newlyUnlocked.length > 0) {
      await unlockItems(db, newlyUnlocked.map((i) => i.id));
      inventory = await getInventory(db);
    }
  }

  return {
    replay,
    level,
    totalXp: replay.totalXp,
    streak: computeStreak(replay.weeks, goalForWeek, currentWeekKey),
    currentWeek: replay.weeks.get(currentWeekKey),
    currentWeekKey,
    weeklyGoal: goalForWeek(currentWeekKey),
    settings,
    inventory,
    exMap,
    newlyUnlocked,
  };
}

export interface FinishResult {
  workoutId: string;
  levelBefore: number;
  levelAfter: number;
  newlyUnlocked: ItemDef[];
}

/** Završava trening, sprema snimku tjednog cilja i preračunava XP. */
export async function finishAndRecompute(db: SQLiteDatabase, workoutId: string, endedAt: number): Promise<FinishResult> {
  const before = await computeProgress(db);
  await finishWorkout(db, workoutId, endedAt);
  const settings = await getSettings(db);
  await saveWeekGoal(db, weekKey(endedAt), settings.weeklyGoal, false);
  const after = await computeProgress(db, { persist: true });
  return {
    workoutId,
    levelBefore: before.level.level,
    levelAfter: after.level.level,
    newlyUnlocked: after.newlyUnlocked,
  };
}

/** Pravila automatskog završetka (odluka C13, O14). */
export const INACTIVITY_MS = 90 * 60 * 1000;
export const MAX_WORKOUT_MS = 4 * 60 * 60 * 1000;

/**
 * Ako je aktivni trening „zaboravljen“, završi ga u trenutku zadnje potvrđene serije.
 * Trening bez ijedne serije se odbacuje. Vraća ID završenog treninga ili null.
 */
export async function autoFinishIfStale(db: SQLiteDatabase, now = Date.now()): Promise<string | null> {
  const active = await getActiveWorkout(db);
  if (!active) return null;
  const { id, startedAt, lastSetAt } = active;

  if (lastSetAt == null) {
    if (now - startedAt >= INACTIVITY_MS) {
      await deleteWorkout(db, id);
      await computeProgress(db, { persist: true });
    }
    return null;
  }

  const inactive = now - lastSetAt >= INACTIVITY_MS;
  const tooLong = now - startedAt >= MAX_WORKOUT_MS;
  if (!inactive && !tooLong) return null;

  const endedAt = Math.min(lastSetAt, startedAt + MAX_WORKOUT_MS);
  await finishAndRecompute(db, id, endedAt);
  return id;
}
