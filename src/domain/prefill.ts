import type { LogType } from './types.ts';

export interface SetValues {
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  distanceKm: number | null;
}

export const EMPTY_VALUES: SetValues = { weightKg: null, reps: null, durationSec: null, distanceKm: null };

/**
 * Unaprijed popunjene vrijednosti serije (odluka C9):
 * prva serija uzima vrijednosti iz zadnjeg treninga te vježbe, a sljedeće iz prethodne serije.
 * @param index redni broj serije u ovoj vježbi (0 = prva)
 * @param previousInThisWorkout prethodna serija iste vježbe u ovom treningu, ako postoji
 * @param lastWorkoutSets potvrđene serije te vježbe sa zadnjeg treninga
 */
export function prefillValues(
  index: number,
  previousInThisWorkout: SetValues | null,
  lastWorkoutSets: SetValues[],
): SetValues {
  if (previousInThisWorkout) return { ...previousInThisWorkout };
  const src = lastWorkoutSets[index] ?? lastWorkoutSets[lastWorkoutSets.length - 1];
  return src ? { ...src } : { ...EMPTY_VALUES };
}

function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace('.', ',');
}

export function formatSetValues(v: SetValues, logType: LogType): string {
  switch (logType) {
    case 'weight_reps':
      return `${trimNumber(v.weightKg ?? 0)} kg × ${v.reps ?? 0}`;
    case 'reps':
      return `${v.reps ?? 0} pon.`;
    case 'time':
      return `${v.durationSec ?? 0} s`;
    case 'cardio': {
      const min = Math.round((v.durationSec ?? 0) / 60);
      return v.distanceKm ? `${min} min, ${trimNumber(v.distanceKm)} km` : `${min} min`;
    }
  }
}

/** Parsira broj koji korisnik upiše (prihvaća i decimalni zarez). */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export const LIMITS = { maxWeightKg: 500, maxReps: 100, maxDurationSec: 4 * 3600 } as const;

/** Provjera vrijednosti prije potvrde serije. Vraća poruku greške ili null. */
export function validateValues(v: SetValues, logType: LogType): string | null {
  switch (logType) {
    case 'weight_reps':
      if (v.weightKg == null || v.weightKg < 0 || v.weightKg > LIMITS.maxWeightKg) return 'Upiši težinu između 0 i 500 kg.';
      if (v.reps == null || !Number.isInteger(v.reps) || v.reps < 1 || v.reps > LIMITS.maxReps)
        return 'Upiši broj ponavljanja između 1 i 100.';
      return null;
    case 'reps':
      if (v.reps == null || !Number.isInteger(v.reps) || v.reps < 1 || v.reps > LIMITS.maxReps)
        return 'Upiši broj ponavljanja između 1 i 100.';
      return null;
    case 'time':
    case 'cardio':
      if (v.durationSec == null || v.durationSec < 1 || v.durationSec > LIMITS.maxDurationSec) return 'Upiši trajanje.';
      if (v.distanceKm != null && (v.distanceKm < 0 || v.distanceKm > 100)) return 'Udaljenost mora biti između 0 i 100 km.';
      return null;
  }
}
