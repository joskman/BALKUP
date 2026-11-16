import type { Equipment, Exercise, LogType, MuscleGroup } from './types.ts';

// Biblioteka vježbi za prototip (43 vježbe, potvrđeno u specifikaciji Etape 0).
// ID-jevi su stalni tekstualni ključevi kako bi se kasnije mogli sinkronizirati.

type Seed = [id: string, nameEn: string, nameHr: string, muscle: MuscleGroup, equipment: Equipment, logType: LogType];

const SEEDS: Seed[] = [
  // Prsa
  ['bench-press-barbell', 'Bench Press (Barbell)', 'Potisak s ravne klupe (šipka)', 'chest', 'barbell', 'weight_reps'],
  ['incline-dumbbell-press', 'Incline Dumbbell Press', 'Kosi potisak s bučicama', 'chest', 'dumbbell', 'weight_reps'],
  ['chest-press-machine', 'Chest Press (Machine)', 'Potisak na spravi za prsa', 'chest', 'machine', 'weight_reps'],
  ['pec-deck', 'Pec Deck', 'Leptir na spravi', 'chest', 'machine', 'weight_reps'],
  ['push-up', 'Push-Up', 'Sklek', 'chest', 'bodyweight', 'reps'],
  // Leđa i trapez
  ['lat-pulldown', 'Lat Pulldown', 'Povlačenje na lat spravi', 'upper_back', 'machine', 'weight_reps'],
  ['seated-cable-row', 'Seated Cable Row', 'Veslanje na sajli sjedeći', 'upper_back', 'cable', 'weight_reps'],
  ['bent-over-barbell-row', 'Bent-Over Barbell Row', 'Pretklonsko veslanje šipkom', 'upper_back', 'barbell', 'weight_reps'],
  ['one-arm-dumbbell-row', 'One-Arm Dumbbell Row', 'Jednoručno veslanje bučicom', 'upper_back', 'dumbbell', 'weight_reps'],
  ['pull-up', 'Pull-Up', 'Zgib', 'upper_back', 'bodyweight', 'reps'],
  ['deadlift', 'Deadlift', 'Mrtvo dizanje', 'lower_back', 'barbell', 'weight_reps'],
  ['back-extension', 'Back Extension', 'Hiperekstenzija', 'lower_back', 'bench', 'reps'],
  ['dumbbell-shrug', 'Dumbbell Shrug', 'Slijeganje ramenima s bučicama', 'traps', 'dumbbell', 'weight_reps'],
  // Ramena
  ['overhead-press-barbell', 'Overhead Press (Barbell)', 'Potisak iznad glave šipkom', 'shoulders', 'barbell', 'weight_reps'],
  ['seated-dumbbell-shoulder-press', 'Seated Dumbbell Shoulder Press', 'Potisak bučicama sjedeći', 'shoulders', 'dumbbell', 'weight_reps'],
  ['shoulder-press-machine', 'Shoulder Press (Machine)', 'Potisak za ramena na spravi', 'shoulders', 'machine', 'weight_reps'],
  ['lateral-raise', 'Lateral Raise', 'Odručenje bučicama', 'shoulders', 'dumbbell', 'weight_reps'],
  ['face-pull', 'Face Pull', 'Povlačenje sajle prema licu', 'shoulders', 'cable', 'weight_reps'],
  // Ruke
  ['barbell-curl', 'Barbell Curl', 'Pregib sa šipkom', 'biceps', 'barbell', 'weight_reps'],
  ['dumbbell-curl', 'Dumbbell Curl', 'Pregib s bučicama', 'biceps', 'dumbbell', 'weight_reps'],
  ['hammer-curl', 'Hammer Curl', 'Čekić pregib', 'biceps', 'dumbbell', 'weight_reps'],
  ['triceps-pushdown', 'Triceps Pushdown', 'Potisak sajle prema dolje', 'triceps', 'cable', 'weight_reps'],
  ['overhead-triceps-extension', 'Overhead Triceps Extension', 'Ekstenzija iznad glave bučicom', 'triceps', 'dumbbell', 'weight_reps'],
  ['dips', 'Dips', 'Propadanja', 'triceps', 'bodyweight', 'reps'],
  // Noge i gluteus
  ['back-squat', 'Back Squat', 'Čučanj sa šipkom', 'quads', 'barbell', 'weight_reps'],
  ['goblet-squat', 'Goblet Squat', 'Goblet čučanj', 'quads', 'dumbbell', 'weight_reps'],
  ['leg-press', 'Leg Press', 'Nožni potisak', 'quads', 'machine', 'weight_reps'],
  ['leg-extension', 'Leg Extension', 'Ekstenzija nogu', 'quads', 'machine', 'weight_reps'],
  ['lying-leg-curl', 'Lying Leg Curl', 'Pregib nogu ležeći', 'hamstrings', 'machine', 'weight_reps'],
  ['romanian-deadlift', 'Romanian Deadlift', 'Rumunjsko mrtvo dizanje', 'hamstrings', 'barbell', 'weight_reps'],
  ['walking-lunge', 'Walking Lunge', 'Iskoraci s bučicama (pon. po nozi)', 'quads', 'dumbbell', 'weight_reps'],
  ['hip-thrust', 'Hip Thrust', 'Potisak kukom', 'glutes', 'barbell', 'weight_reps'],
  ['standing-calf-raise', 'Standing Calf Raise', 'Podizanje na prste stojeći', 'calves', 'machine', 'weight_reps'],
  ['hip-adduction', 'Hip Adduction', 'Primicanje nogu na spravi', 'adductors', 'machine', 'weight_reps'],
  ['hip-abduction', 'Hip Abduction', 'Odmicanje nogu na spravi', 'glutes', 'machine', 'weight_reps'],
  // Trbuh i core
  ['plank', 'Plank', 'Plank', 'core', 'bodyweight', 'time'],
  ['crunch', 'Crunch', 'Trbušnjak', 'core', 'bodyweight', 'reps'],
  ['hanging-knee-raise', 'Hanging Knee Raise', 'Podizanje koljena u visu', 'core', 'bodyweight', 'reps'],
  // Kardio
  ['treadmill', 'Treadmill', 'Traka za trčanje', 'cardio', 'cardio_machine', 'cardio'],
  ['stationary-bike', 'Stationary Bike', 'Sobni bicikl', 'cardio', 'cardio_machine', 'cardio'],
  ['rowing-machine', 'Rowing Machine', 'Veslač', 'cardio', 'cardio_machine', 'cardio'],
  ['elliptical', 'Elliptical', 'Eliptični trenažer', 'cardio', 'cardio_machine', 'cardio'],
  ['stair-climber', 'Stair Climber', 'Stepper', 'cardio', 'cardio_machine', 'cardio'],
];

export const SEED_EXERCISES: Exercise[] = SEEDS.map(([id, nameEn, nameHr, muscle, equipment, logType]) => ({
  id,
  nameEn,
  nameHr,
  muscle,
  equipment,
  logType,
  isCustom: false,
}));

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Prsa',
  upper_back: 'Gornja leđa i latissimus',
  lower_back: 'Donja leđa',
  traps: 'Trapez',
  shoulders: 'Ramena',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Podlaktice',
  core: 'Trbuh i core',
  quads: 'Kvadricepsi',
  hamstrings: 'Stražnja loža',
  glutes: 'Gluteus',
  calves: 'Listovi',
  adductors: 'Aduktori i abduktori',
  full_body: 'Cijelo tijelo',
  cardio: 'Kardio',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Šipka',
  dumbbell: 'Bučice',
  machine: 'Sprava',
  cable: 'Sajla',
  bodyweight: 'Vlastita težina',
  bench: 'Klupa',
  cardio_machine: 'Kardio sprava',
  other: 'Ostalo',
};

export const LOG_TYPE_LABELS: Record<LogType, string> = {
  weight_reps: 'kg × ponavljanja',
  reps: 'Ponavljanja',
  time: 'Vrijeme (sekunde)',
  cardio: 'Trajanje (+ udaljenost)',
};

/** Mišićne skupine koje izazov „leđa“ prihvaća. */
export const BACK_MUSCLES: MuscleGroup[] = ['upper_back', 'lower_back'];

/** Pretraga po engleskom i hrvatskom nazivu, bez obzira na velika slova i dijakritike. */
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/č|ć/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'd');
}

export function matchesSearch(ex: Exercise, query: string): boolean {
  const q = normalizeForSearch(query.trim());
  if (!q) return true;
  return normalizeForSearch(ex.nameEn).includes(q) || normalizeForSearch(ex.nameHr).includes(q);
}
