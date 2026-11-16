// Automatski testovi XP motora. Pokretanje: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SEED_EXERCISES } from './exercises.ts';
import { itemsUnlockedAt } from './items.ts';
import { levelFromXp, totalXpForLevel } from './levels.ts';
import { prefillValues, validateValues } from './prefill.ts';
import type { Exercise, WorkoutEntry } from './types.ts';
import { weekKey } from './weeks.ts';
import { computeStreak, replayHistory, XP_RULES } from './xp.ts';

const exMap = new Map<string, Exercise>(SEED_EXERCISES.map((e) => [e.id, e]));
const STRENGTH = ['bench-press-barbell', 'lat-pulldown', 'leg-press', 'lateral-raise', 'barbell-curl'];

let idCounter = 0;
const nextId = () => `id-${++idCounter}`;

interface SetSpec {
  w?: number;
  r?: number;
  sec?: number;
  /** sekunde od početka treninga u kojima je serija potvrđena */
  at: number;
}

function workout(
  start: Date,
  durationMin: number,
  exercises: { id: string; sets: SetSpec[] }[],
  opts: { backfilled?: boolean } = {},
): WorkoutEntry {
  const startedAt = start.getTime();
  return {
    id: nextId(),
    startedAt,
    endedAt: startedAt + durationMin * 60000,
    isBackfilled: opts.backfilled ?? false,
    exercises: exercises.map((e, i) => ({
      id: nextId(),
      exerciseId: e.id,
      position: i,
      completedAt: null,
      sets: e.sets.map((s) => ({
        id: nextId(),
        weightKg: s.w ?? null,
        reps: s.r ?? null,
        durationSec: s.sec ?? null,
        distanceKm: null,
        confirmedAt: startedAt + s.at * 1000,
      })),
    })),
  };
}

/** n vježbi × 3 serije, serije razmaknute 2 minute. */
function standardWorkout(start: Date, ids: string[], reps: (exIndex: number) => number, weight = 60): WorkoutEntry {
  let t = 0;
  return workout(
    start,
    60,
    ids.map((id, i) => ({
      id,
      sets: [0, 1, 2].map(() => ({ w: weight, r: reps(i), at: (t += 120) })),
    })),
  );
}

const goal3 = () => 3;
const sumFor = (events: { workoutId: string | null; amount: number }[], workoutId: string) =>
  events.filter((e) => e.workoutId === workoutId).reduce((s, e) => s + e.amount, 0);

// 16.11.2026. je ponedjeljak.
const MON = (h = 10) => new Date(2026, 10, 16, h, 0);
const WED = (h = 10) => new Date(2026, 10, 18, h, 0);

describe('XP za trening (kriterij prihvaćanja 4)', () => {
  it('5 vježbi × 3 serije + 2 poboljšanja = 230 XP', () => {
    const first = standardWorkout(MON(), STRENGTH, () => 8);
    const second = standardWorkout(WED(), STRENGTH, (i) => (i < 2 ? 9 : 8));
    const { events } = replayHistory([first, second], exMap, goal3);
    assert.equal(sumFor(events, second.id), 150 + 50 + 30);
  });

  it('prvi trening ikad nema bonus za poboljšanje ni rekord', () => {
    const first = standardWorkout(MON(), STRENGTH, () => 8);
    const { events } = replayHistory([first], exMap, goal3);
    assert.equal(sumFor(events, first.id), 150 + 50);
  });

  it('veća težina donosi i poboljšanje (+15) i osobni rekord (+30)', () => {
    const first = standardWorkout(MON(), ['bench-press-barbell'], () => 8, 60);
    const second = standardWorkout(WED(), ['bench-press-barbell'], () => 8, 65);
    const { events } = replayHistory([first, second], exMap, goal3);
    const sources = events.filter((e) => e.workoutId === second.id).map((e) => `${e.source}:${e.amount}`);
    assert.deepEqual(sources.sort(), ['completion:50', 'improvement:15', 'pr:30', 'set:30'].sort());
  });
});

describe('provjere uvjerljivosti (kriterij prihvaćanja 5)', () => {
  it('serija potvrđena 5 s nakon prethodne ne donosi XP i dobiva objašnjenje', () => {
    const w = workout(MON(), 30, [
      { id: 'bench-press-barbell', sets: [{ w: 60, r: 8, at: 60 }, { w: 60, r: 8, at: 65 }, { w: 60, r: 8, at: 200 }] },
    ]);
    const { events, notes } = replayHistory([w], exMap, goal3);
    const setXp = events.find((e) => e.workoutId === w.id && e.source === 'set');
    assert.equal(setXp?.amount, 20);
    assert.deepEqual(notes.find((n) => n.reason === 'too_fast'), { workoutId: w.id, reason: 'too_fast', count: 1 });
  });

  it('najviše 5 serija po vježbi donosi XP', () => {
    const w = workout(MON(), 40, [
      { id: 'bench-press-barbell', sets: [1, 2, 3, 4, 5, 6, 7].map((i) => ({ w: 60, r: 8, at: i * 100 })) },
    ]);
    const { events, notes } = replayHistory([w], exMap, goal3);
    assert.equal(events.find((e) => e.source === 'set')?.amount, 50);
    assert.equal(notes.find((n) => n.reason === 'cap_exercise')?.count, 2);
  });

  it('najviše 25 serija po treningu donosi XP', () => {
    let t = 0;
    const ids = SEED_EXERCISES.filter((e) => e.logType === 'weight_reps').slice(0, 6).map((e) => e.id);
    const w = workout(MON(), 90, ids.map((id) => ({ id, sets: [1, 2, 3, 4, 5].map(() => ({ w: 20, r: 10, at: (t += 60) })) })));
    const { events, notes } = replayHistory([w], exMap, goal3);
    const setXp = events.filter((e) => e.source === 'set').reduce((s, e) => s + e.amount, 0);
    assert.equal(setXp, 25 * XP_RULES.perSet);
    assert.equal(notes.find((n) => n.reason === 'cap_workout')?.count, 5);
  });

  it('kardio: 10 XP po 5 minuta, najviše 30 minuta', () => {
    const w = workout(MON(), 50, [{ id: 'treadmill', sets: [{ sec: 45 * 60, at: 60 }] }]);
    const { events, notes } = replayHistory([w], exMap, goal3);
    assert.equal(events.find((e) => e.source === 'cardio')?.amount, 60);
    assert.ok(notes.some((n) => n.reason === 'cardio_cap'));
  });

  it('trening kraći od 15 minuta nema bonus za završetak', () => {
    const w = workout(MON(), 10, [{ id: 'push-up', sets: [{ r: 10, at: 60 }] }]);
    const { events } = replayHistory([w], exMap, goal3);
    assert.equal(events.some((e) => e.source === 'completion'), false);
  });

  it('drugi trening u danu donosi 50 %, treći 0 %', () => {
    const a = standardWorkout(MON(8), ['leg-press'], () => 10);
    const b = standardWorkout(MON(12), ['lat-pulldown'], () => 10);
    const c = standardWorkout(MON(18), ['dumbbell-curl'], () => 10);
    const { events } = replayHistory([a, b, c], exMap, goal3);
    assert.equal(sumFor(events, a.id), 30 + 50);
    assert.equal(sumFor(events, b.id), Math.floor(30 * 0.5) + Math.floor(50 * 0.5));
    assert.equal(sumFor(events, c.id), 0);
  });

  it('naknadno unesen trening ne donosi XP', () => {
    const w = standardWorkout(MON(), STRENGTH, () => 8);
    w.isBackfilled = true;
    const { events, totalXp } = replayHistory([w], exMap, goal3);
    assert.equal(sumFor(events, w.id), 0);
    assert.equal(totalXp, 0);
  });
});

describe('tjedni cilj, izazovi i niz', () => {
  it('tjedni cilj donosi 200 XP samo za treninge uživo', () => {
    const a = standardWorkout(MON(), ['leg-press'], () => 10);
    const b = standardWorkout(WED(), ['leg-press'], () => 10);
    const c = standardWorkout(new Date(2026, 10, 20, 10), ['leg-press'], () => 10);
    c.isBackfilled = true;
    let r = replayHistory([a, b, c], exMap, goal3);
    assert.equal(r.events.some((e) => e.source === 'weekly_goal'), false, 'naknadni unos ne smije donijeti bonus');
    assert.equal(r.weeks.get('2026-11-16')?.allCount, 3);
    c.isBackfilled = false;
    r = replayHistory([a, b, c], exMap, goal3);
    assert.equal(r.events.filter((e) => e.source === 'weekly_goal').length, 1);
  });

  it('izazovi: 2 vježbe za leđa, 10 min kardija, nova vježba', () => {
    const w = workout(MON(), 40, [
      { id: 'lat-pulldown', sets: [{ w: 40, r: 10, at: 60 }] },
      { id: 'deadlift', sets: [{ w: 60, r: 5, at: 200 }] },
      { id: 'stationary-bike', sets: [{ sec: 600, at: 900 }] },
    ]);
    const { events } = replayHistory([w], exMap, goal3);
    const challenges = events.filter((e) => e.source === 'challenge').map((e) => e.reason).sort();
    assert.deepEqual(challenges, ['back-two', 'cardio-10', 'try-new']);
  });

  it('niz broji uzastopne tjedne, a tekući tjedan ga ne prekida', () => {
    const weeks = [0, 1, 2].flatMap((wkOffset) =>
      [0, 2, 4].map((day) => standardWorkout(new Date(2026, 10, 2 + wkOffset * 7 + day, 10), ['leg-press'], () => 10)),
    );
    const { weeks: progress } = replayHistory(weeks, exMap, goal3);
    // Tjedni 2.11., 9.11. i 16.11. imaju po 3 treninga.
    assert.equal(computeStreak(progress, goal3, '2026-11-16'), 3);
    // U novom tjednu (23.11.) još nema treninga, ali niz se ne prekida.
    assert.equal(computeStreak(progress, goal3, '2026-11-23'), 3);
    // Tjedan bez ispunjenog cilja prekida niz.
    assert.equal(computeStreak(progress, goal3, '2026-11-30'), 0);
  });
});

describe('leveli i oprema', () => {
  it('krivulja levela', () => {
    assert.equal(levelFromXp(0).level, 1);
    assert.equal(levelFromXp(99).level, 1);
    assert.equal(levelFromXp(100).level, 2);
    assert.equal(levelFromXp(700).level, 5);
    assert.equal(levelFromXp(2700).level, 10);
    assert.equal(totalXpForLevel(20), 10450);
    assert.equal(totalXpForLevel(50), 63700);
  });

  it('prvi predmet se otključava na levelu 2 (kriterij prihvaćanja 7)', () => {
    assert.equal(itemsUnlockedAt(1).length, 0);
    assert.equal(itemsUnlockedAt(2).length, 1);
    assert.equal(itemsUnlockedAt(12).length, 8);
  });
});

describe('tjedni i unaprijed popunjene vrijednosti', () => {
  it('tjedan počinje u ponedjeljak', () => {
    assert.equal(weekKey(new Date(2026, 10, 22, 23, 59).getTime()), '2026-11-16'); // nedjelja
    assert.equal(weekKey(new Date(2026, 10, 23, 0, 1).getTime()), '2026-11-23'); // ponedjeljak
  });

  it('prva serija iz zadnjeg treninga, sljedeće iz prethodne (kriterij prihvaćanja 10)', () => {
    const last = [
      { weightKg: 60, reps: 8, durationSec: null, distanceKm: null },
      { weightKg: 60, reps: 7, durationSec: null, distanceKm: null },
    ];
    assert.deepEqual(prefillValues(0, null, last), last[0]);
    assert.deepEqual(prefillValues(1, null, last), last[1]);
    assert.deepEqual(prefillValues(5, null, last), last[1]);
    const prev = { weightKg: 62.5, reps: 6, durationSec: null, distanceKm: null };
    assert.deepEqual(prefillValues(1, prev, last), prev);
  });

  it('provjera unosa', () => {
    assert.equal(validateValues({ weightKg: 60, reps: 8, durationSec: null, distanceKm: null }, 'weight_reps'), null);
    assert.notEqual(validateValues({ weightKg: 60, reps: 200, durationSec: null, distanceKm: null }, 'weight_reps'), null);
    assert.notEqual(validateValues({ weightKg: null, reps: 8, durationSec: null, distanceKm: null }, 'weight_reps'), null);
  });
});
