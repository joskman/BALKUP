// Osnovni tipovi domene. Ova mapa (src/domain) ne smije ovisiti o React Nativeu ni o bazi,
// kako bi se logika mogla testirati naredbom `npm test` (node --test).

/** Kako se vježba bilježi. */
export type LogType =
  | 'weight_reps' // kg × ponavljanja
  | 'reps' // samo ponavljanja (vlastita težina)
  | 'time' // vježba na vrijeme, npr. plank (sekunde po seriji)
  | 'cardio'; // kardio na spravi: trajanje (+ opcionalno udaljenost)

export type MuscleGroup =
  | 'chest'
  | 'upper_back'
  | 'lower_back'
  | 'traps'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'adductors'
  | 'full_body'
  | 'cardio';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'bench'
  | 'cardio_machine'
  | 'other';

export interface Exercise {
  id: string;
  nameEn: string;
  nameHr: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  logType: LogType;
  isCustom: boolean;
}

export interface SetEntry {
  id: string;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  distanceKm: number | null;
  /** Vrijeme potvrde (ms). Nepotvrđena serija se nikad ne računa. */
  confirmedAt: number | null;
}

export interface WorkoutExerciseEntry {
  id: string;
  exerciseId: string;
  position: number;
  completedAt: number | null;
  sets: SetEntry[];
}

export interface WorkoutEntry {
  id: string;
  startedAt: number;
  endedAt: number | null;
  isBackfilled: boolean;
  exercises: WorkoutExerciseEntry[];
}

export type XpSource =
  | 'set'
  | 'cardio'
  | 'completion'
  | 'improvement'
  | 'pr'
  | 'challenge'
  | 'weekly_goal';

export interface XpEventDraft {
  source: XpSource;
  amount: number;
  workoutId: string | null;
  exerciseId: string | null;
  weekKey: string | null;
  /** Kratko objašnjenje (npr. id izazova). */
  reason: string;
}

export type NoteReason =
  | 'too_fast' // potvrđena < 20 s nakon prethodne serije
  | 'cap_exercise' // više od 5 serija na vježbi
  | 'cap_workout' // više od 25 serija u treningu
  | 'cardio_cap' // više od 30 min kardija
  | 'daily_half' // drugi trening u danu (50 %)
  | 'daily_zero' // treći ili kasniji trening u danu (0 %)
  | 'too_short'; // trening kraći od 15 min (nema bonusa za završen trening)

export interface XpNote {
  workoutId: string;
  reason: NoteReason;
  /** Broj serija na koje se napomena odnosi (0 za napomene na razini treninga). */
  count: number;
}
