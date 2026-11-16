// Krivulja levela (odluka D4): od levela n do levela n+1 treba 100 + 50 × (n − 1) XP.

export function xpToNextLevel(level: number): number {
  return 100 + 50 * (level - 1);
}

/** Ukupni XP potreban da se dosegne `level` (level 1 = 0 XP). */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let n = 1; n < level; n++) total += xpToNextLevel(n);
  return total;
}

export interface LevelInfo {
  level: number;
  /** XP skupljen unutar trenutnog levela. */
  xpIntoLevel: number;
  /** XP potreban za sljedeći level (od početka trenutnog levela). */
  xpForNext: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level++;
  }
  return { level, xpIntoLevel: remaining, xpForNext: xpToNextLevel(level) };
}
