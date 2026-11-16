// XP motor. XP se uvijek računa iz cijele povijesti (deterministička „reprodukcija“),
// pa je rezultat isti bez obzira na redoslijed spremanja, a promjena pravila ili
// brisanje treninga automatski ispravlja XP. Isti pristup kasnije koristi server.

import { BACK_MUSCLES } from './exercises.ts';
import type {
  Exercise,
  LogType,
  NoteReason,
  SetEntry,
  WorkoutEntry,
  XpEventDraft,
  XpNote,
} from './types.ts';
import { dayKey, previousWeekKey, weekKey } from './weeks.ts';

/** Sve brojke su početne pretpostavke za kalibraciju na prototipu (odluka D2, O21). */
export const XP_RULES = {
  perSet: 10,
  maxSetsPerExercise: 5,
  maxSetsPerWorkout: 25,
  cardioPerBlock: 10,
  cardioBlockSec: 5 * 60,
  cardioMaxSec: 30 * 60,
  completion: 50,
  minWorkoutMs: 15 * 60 * 1000,
  improvement: 15,
  pr: 30,
  challenge: 75,
  weeklyGoal: 200,
  minMsBetweenSets: 20 * 1000,
} as const;

export interface ChallengeDef {
  id: 'back-two' | 'cardio-10' | 'try-new';
  title: string;
  target: number;
  unit: 'count' | 'seconds';
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'back-two', title: 'Odradi barem 2 različite vježbe za leđa', target: 2, unit: 'count' },
  { id: 'cardio-10', title: 'Skupi 10 minuta kardija', target: 10 * 60, unit: 'seconds' },
  { id: 'try-new', title: 'Isprobaj vježbu koju još nisi radio', target: 1, unit: 'count' },
];

export interface WeekProgress {
  weekKey: string;
  /** Završeni treninzi uživo (s barem jednom potvrđenom serijom). Računaju se za XP bonus. */
  liveCount: number;
  /** Svi završeni treninzi, uključujući naknadno unesene. Računaju se za tjedni niz. */
  allCount: number;
  backDistinct: number;
  cardioSec: number;
  triedNew: boolean;
}

export interface ReplayResult {
  events: XpEventDraft[];
  notes: XpNote[];
  weeks: Map<string, WeekProgress>;
  totalXp: number;
}

export function isValidSet(set: SetEntry, logType: LogType): boolean {
  if (set.confirmedAt == null) return false;
  switch (logType) {
    case 'weight_reps':
      return (set.reps ?? 0) >= 1 && (set.weightKg ?? 0) >= 0;
    case 'reps':
      return (set.reps ?? 0) >= 1;
    case 'time':
    case 'cardio':
      return (set.durationSec ?? 0) >= 1;
  }
}

/** Mjera „kvalitete“ serije za usporedbu „bolje nego prošli put“. */
export function setScore(set: SetEntry, logType: LogType): number {
  switch (logType) {
    case 'weight_reps':
      // Volumen serije; ponavljanja služe kao sitni razrješivač kad je težina 0.
      return (set.weightKg ?? 0) * (set.reps ?? 0) + (set.reps ?? 0) * 1e-6;
    case 'reps':
      return set.reps ?? 0;
    case 'time':
      return set.durationSec ?? 0;
    case 'cardio':
      return 0;
  }
}

interface ExerciseState {
  lastBest: number | null;
  maxWeight: number;
  seen: boolean;
}

interface FlatSet {
  set: SetEntry;
  exerciseId: string;
  logType: LogType;
}

/** Potvrđene serije treninga poredane po vremenu potvrde, uz oznaku „prebrzo“. */
function analyze(workout: WorkoutEntry, exMap: Map<string, Exercise>) {
  const flat: FlatSet[] = [];
  for (const we of workout.exercises) {
    const ex = exMap.get(we.exerciseId);
    if (!ex) continue;
    for (const set of we.sets) {
      if (set.confirmedAt != null) flat.push({ set, exerciseId: we.exerciseId, logType: ex.logType });
    }
  }
  flat.sort((a, b) => (a.set.confirmedAt as number) - (b.set.confirmedAt as number));

  const tooFast = new Set<string>();
  if (!workout.isBackfilled) {
    for (let i = 1; i < flat.length; i++) {
      const gap = (flat[i].set.confirmedAt as number) - (flat[i - 1].set.confirmedAt as number);
      if (gap < XP_RULES.minMsBetweenSets) tooFast.add(flat[i].set.id);
    }
  }

  const valid = flat.filter((f) => isValidSet(f.set, f.logType));
  const plausible = valid.filter((f) => !tooFast.has(f.set.id));
  return { valid, plausible, tooFastValid: valid.filter((f) => tooFast.has(f.set.id)).length };
}

function emptyWeek(key: string): WeekProgress {
  return { weekKey: key, liveCount: 0, allCount: 0, backDistinct: 0, cardioSec: 0, triedNew: false };
}

/**
 * Reproducira cijelu povijest i vraća sve XP događaje.
 * @param goalForWeek tjedni cilj za zadani tjedan (snimka cilja ili trenutna postavka)
 */
export function replayHistory(
  workouts: WorkoutEntry[],
  exMap: Map<string, Exercise>,
  goalForWeek: (weekKey: string) => number,
): ReplayResult {
  const finished = workouts
    .filter((w) => w.endedAt != null)
    .sort((a, b) => a.startedAt - b.startedAt);

  const events: XpEventDraft[] = [];
  const notes: XpNote[] = [];
  const state = new Map<string, ExerciseState>();
  const liveByDay = new Map<string, number>();
  const weeks = new Map<string, WeekProgress>();
  const backByWeek = new Map<string, Set<string>>();

  for (const w of finished) {
    const { valid, plausible, tooFastValid } = analyze(w, exMap);
    const counted = w.isBackfilled ? valid : plausible;
    const wk = weekKey(w.startedAt);
    const week = weeks.get(wk) ?? emptyWeek(wk);
    weeks.set(wk, week);

    // Najbolji rezultat i najveća težina po vježbi u ovom treningu.
    const perExercise = new Map<string, { best: number; maxWeight: number; logType: LogType }>();
    for (const f of counted) {
      const cur = perExercise.get(f.exerciseId) ?? { best: -1, maxWeight: 0, logType: f.logType };
      cur.best = Math.max(cur.best, setScore(f.set, f.logType));
      if (f.logType === 'weight_reps') cur.maxWeight = Math.max(cur.maxWeight, f.set.weightKg ?? 0);
      perExercise.set(f.exerciseId, cur);
    }

    if (valid.length > 0) {
      week.allCount++;
      if (!w.isBackfilled) week.liveCount++;
    }

    if (!w.isBackfilled && valid.length > 0) {
      const workoutEvents: XpEventDraft[] = [];
      const add = (e: Omit<XpEventDraft, 'workoutId' | 'weekKey'>) =>
        workoutEvents.push({ ...e, workoutId: w.id, weekKey: wk });
      const note = (reason: NoteReason, count: number) => notes.push({ workoutId: w.id, reason, count });

      if (tooFastValid > 0) note('too_fast', tooFastValid);

      // Serije (snaga, vlastita težina, vrijeme) uz granice po vježbi i po treningu.
      const perExerciseCount = new Map<string, number>();
      let workoutCount = 0;
      let capExercise = 0;
      let capWorkout = 0;
      let cardioSec = 0;
      for (const f of plausible) {
        if (f.logType === 'cardio') {
          cardioSec += f.set.durationSec ?? 0;
          continue;
        }
        const n = perExerciseCount.get(f.exerciseId) ?? 0;
        if (n >= XP_RULES.maxSetsPerExercise) {
          capExercise++;
        } else if (workoutCount >= XP_RULES.maxSetsPerWorkout) {
          capWorkout++;
        } else {
          perExerciseCount.set(f.exerciseId, n + 1);
          workoutCount++;
        }
      }
      for (const [exerciseId, n] of perExerciseCount) {
        add({ source: 'set', amount: n * XP_RULES.perSet, exerciseId, reason: `${n} serija` });
      }
      if (capExercise > 0) note('cap_exercise', capExercise);
      if (capWorkout > 0) note('cap_workout', capWorkout);

      // Kardio: 10 XP po punih 5 minuta, najviše 30 minuta po treningu.
      if (cardioSec > 0) {
        const countedSec = Math.min(cardioSec, XP_RULES.cardioMaxSec);
        const amount = Math.floor(countedSec / XP_RULES.cardioBlockSec) * XP_RULES.cardioPerBlock;
        if (amount > 0) add({ source: 'cardio', amount, exerciseId: null, reason: `${Math.floor(countedSec / 60)} min` });
        if (cardioSec > XP_RULES.cardioMaxSec) note('cardio_cap', 0);
      }

      // Završen trening (najmanje 15 minuta).
      if ((w.endedAt as number) - w.startedAt >= XP_RULES.minWorkoutMs) {
        add({ source: 'completion', amount: XP_RULES.completion, exerciseId: null, reason: 'završen trening' });
      } else {
        note('too_short', 0);
      }

      // Bolje nego prošli put i osobni rekord (u odnosu na vlastitu povijest).
      for (const [exerciseId, cur] of perExercise) {
        if (cur.logType === 'cardio') continue;
        const prev = state.get(exerciseId);
        if (prev?.lastBest != null && cur.best > prev.lastBest) {
          add({ source: 'improvement', amount: XP_RULES.improvement, exerciseId, reason: 'bolje nego prošli put' });
        }
        if (cur.logType === 'weight_reps' && prev?.seen && prev.maxWeight > 0 && cur.maxWeight > prev.maxWeight) {
          add({ source: 'pr', amount: XP_RULES.pr, exerciseId, reason: `${cur.maxWeight} kg` });
        }
      }

      // Više treninga u istom danu: drugi 50 %, treći i dalje 0 %.
      const dk = dayKey(w.startedAt);
      const nth = liveByDay.get(dk) ?? 0;
      liveByDay.set(dk, nth + 1);
      const multiplier = nth === 0 ? 1 : nth === 1 ? 0.5 : 0;
      if (nth === 1) note('daily_half', 0);
      if (nth >= 2) note('daily_zero', 0);

      for (const e of workoutEvents) {
        const amount = Math.floor(e.amount * multiplier);
        if (amount > 0) events.push({ ...e, amount });
      }
    }

    // Izazovi tjedna (samo treninzi uživo).
    if (!w.isBackfilled) {
      const back = backByWeek.get(wk) ?? new Set<string>();
      backByWeek.set(wk, back);
      for (const f of plausible) {
        const ex = exMap.get(f.exerciseId);
        if (ex && BACK_MUSCLES.includes(ex.muscle)) back.add(f.exerciseId);
        if (f.logType === 'cardio') week.cardioSec += f.set.durationSec ?? 0;
      }
      week.backDistinct = back.size;
    }

    // Ažuriraj povijest vježbi.
    for (const [exerciseId, cur] of perExercise) {
      const prev = state.get(exerciseId);
      if (!prev?.seen && !w.isBackfilled) week.triedNew = true;
      state.set(exerciseId, {
        lastBest: cur.logType === 'cardio' ? null : cur.best,
        maxWeight: Math.max(prev?.maxWeight ?? 0, cur.maxWeight),
        seen: true,
      });
    }
  }

  // Tjedni cilj i izazovi.
  for (const week of [...weeks.values()].sort((a, b) => a.weekKey.localeCompare(b.weekKey))) {
    const goal = goalForWeek(week.weekKey);
    const wkEvent = (reason: string, amount: number, source: XpEventDraft['source']) =>
      events.push({ source, amount, workoutId: null, exerciseId: null, weekKey: week.weekKey, reason });
    if (week.liveCount >= goal) wkEvent(`cilj ${goal}`, XP_RULES.weeklyGoal, 'weekly_goal');
    if (week.backDistinct >= 2) wkEvent('back-two', XP_RULES.challenge, 'challenge');
    if (week.cardioSec >= 600) wkEvent('cardio-10', XP_RULES.challenge, 'challenge');
    if (week.triedNew) wkEvent('try-new', XP_RULES.challenge, 'challenge');
  }

  const totalXp = events.reduce((s, e) => s + e.amount, 0);
  return { events, notes, weeks, totalXp };
}

export function challengeProgress(week: WeekProgress | undefined, id: ChallengeDef['id']): number {
  if (!week) return 0;
  switch (id) {
    case 'back-two':
      return week.backDistinct;
    case 'cardio-10':
      return week.cardioSec;
    case 'try-new':
      return week.triedNew ? 1 : 0;
  }
}

/** Tjedni niz: uzastopni tjedni s ispunjenim ciljem. Tekući tjedan ga ne prekida. */
export function computeStreak(
  weeks: Map<string, WeekProgress>,
  goalForWeek: (weekKey: string) => number,
  currentWeekKey: string,
): number {
  let streak = 0;
  const met = (wk: string) => (weeks.get(wk)?.allCount ?? 0) >= goalForWeek(wk);
  if (met(currentWeekKey)) streak++;
  let wk = previousWeekKey(currentWeekKey);
  for (let i = 0; i < 1000 && met(wk); i++) {
    streak++;
    wk = previousWeekKey(wk);
  }
  return streak;
}

/** XP koji je jedna vježba donijela u treningu (za poruku „+XP“ nakon vježbe). */
export function xpForExercise(
  events: XpEventDraft[],
  workoutId: string,
  exerciseId: string,
  isCardio: boolean,
): number {
  return events
    .filter((e) => e.workoutId === workoutId && (e.exerciseId === exerciseId || (isCardio && e.source === 'cardio')))
    .reduce((s, e) => s + e.amount, 0);
}

export const NOTE_TEXT: Record<NoteReason, (count: number) => string> = {
  too_fast: (n) => `${n} ${n === 1 ? 'serija nije donijela' : 'serije nisu donijele'} XP: potvrđeno manje od 20 s nakon prethodne serije.`,
  cap_exercise: (n) => `${n} ${n === 1 ? 'serija' : 'serije'} iznad 5 po vježbi: zabilježeno u statistici, bez XP-a.`,
  cap_workout: (n) => `${n} ${n === 1 ? 'serija' : 'serije'} iznad 25 po treningu: zabilježeno u statistici, bez XP-a.`,
  cardio_cap: () => 'Kardio iznad 30 minuta ne donosi dodatni XP.',
  daily_half: () => 'Drugi trening danas donosi 50 % XP-a. Odmor je dio treninga.',
  daily_zero: () => 'Treći i svaki sljedeći trening danas ne donosi XP. Odmor je dio treninga.',
  too_short: () => 'Trening je kraći od 15 minuta, pa nema bonusa za završen trening.',
};
