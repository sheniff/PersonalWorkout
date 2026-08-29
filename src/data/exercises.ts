import type { Exercise } from './types';

/**
 * Every exercise used across the six phases of the BLS 5-day routine.
 *
 * Rep ranges follow the program: hard sets are 4–6 reps, except the exercises
 * marked with an asterisk in the PDF, which are 6–8. Core work is tracked in
 * its own higher range (or in seconds, for planks).
 */
const list: Exercise[] = [
  // ---- Chest / push -------------------------------------------------------
  {
    slug: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'chest',
    cue: 'Shoulder blades pinched, bar to mid-chest.',
  },
  {
    slug: 'incline-barbell-bench-press',
    name: 'Incline Barbell Bench Press',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'chest',
    cue: 'Bench at 30–45°, bar to upper chest.',
  },
  {
    slug: 'dumbbell-bench-press',
    name: 'Dumbbell Bench Press',
    load: 'dumbbell',
    repRange: [4, 6],
    muscle: 'chest',
  },
  {
    slug: 'incline-dumbbell-bench-press',
    name: 'Incline Dumbbell Bench Press',
    load: 'dumbbell',
    repRange: [4, 6],
    muscle: 'chest',
  },
  {
    slug: 'close-grip-bench-press',
    name: 'Close-Grip Bench Press',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'triceps',
    cue: 'Hands shoulder-width, elbows tucked.',
  },
  {
    slug: 'dip',
    name: 'Dip',
    load: 'bodyweight_plus',
    repRange: [6, 8],
    muscle: 'triceps',
    cue: 'Lean forward slightly. Add weight once 8 reps is easy.',
  },

  // ---- Triceps ------------------------------------------------------------
  {
    slug: 'triceps-pushdown',
    name: 'Triceps Pushdown',
    load: 'cable',
    repRange: [4, 6],
    muscle: 'triceps',
  },
  {
    slug: 'lying-triceps-extension',
    name: 'Lying Triceps Extension (“Skullcrusher”)',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'triceps',
  },
  {
    slug: 'seated-triceps-press',
    name: 'Seated Triceps Press',
    load: 'dumbbell',
    repRange: [4, 6],
    muscle: 'triceps',
  },

  // ---- Back / pull --------------------------------------------------------
  {
    slug: 'barbell-deadlift',
    name: 'Barbell Deadlift',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'back',
    cue: 'Neutral spine, bar against the shins.',
  },
  {
    slug: 'barbell-row',
    name: 'Barbell Row',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'back',
  },
  {
    slug: 'one-arm-dumbbell-row',
    name: 'One-Arm Dumbbell Row',
    load: 'dumbbell',
    repRange: [4, 6],
    muscle: 'back',
  },
  {
    slug: 'seated-cable-row-wide',
    name: 'Seated Cable Row (Wide-Grip)',
    load: 'cable',
    repRange: [4, 6],
    muscle: 'back',
  },
  {
    slug: 'seated-cable-row-close',
    name: 'Seated Cable Row (Close-Grip)',
    load: 'cable',
    repRange: [4, 6],
    muscle: 'back',
  },
  {
    slug: 'lat-pulldown-wide',
    name: 'Lat Pulldown (Wide-Grip)',
    load: 'cable',
    repRange: [4, 6],
    muscle: 'back',
  },
  {
    slug: 'lat-pulldown-close',
    name: 'Lat Pulldown (Close-Grip)',
    load: 'cable',
    repRange: [4, 6],
    muscle: 'back',
  },
  {
    slug: 'chin-up',
    name: 'Chin-Up',
    load: 'bodyweight_plus',
    repRange: [4, 6],
    muscle: 'back',
    cue: 'Underhand grip. Add weight once 6 reps is easy.',
  },
  {
    slug: 'pull-up',
    name: 'Pull-Up',
    load: 'bodyweight_plus',
    repRange: [4, 6],
    muscle: 'back',
    cue: 'Overhand grip. Add weight once 6 reps is easy.',
  },

  // ---- Shoulders ----------------------------------------------------------
  {
    slug: 'seated-dumbbell-press',
    name: 'Seated Dumbbell Press',
    load: 'dumbbell',
    repRange: [4, 6],
    muscle: 'shoulders',
  },
  {
    slug: 'arnold-dumbbell-press',
    name: 'Arnold Dumbbell Press',
    load: 'dumbbell',
    repRange: [4, 6],
    muscle: 'shoulders',
  },
  {
    slug: 'barbell-rear-delt-row',
    name: 'Barbell Rear Delt Row',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'shoulders',
  },
  {
    slug: 'dumbbell-side-lateral-raise',
    name: 'Dumbbell Side Lateral Raise',
    load: 'dumbbell',
    repRange: [6, 8],
    muscle: 'shoulders',
  },
  {
    slug: 'dumbbell-rear-lateral-raise-seated',
    name: 'Dumbbell Rear Lateral Raise (Seated)',
    load: 'dumbbell',
    repRange: [6, 8],
    muscle: 'shoulders',
  },
  {
    slug: 'dumbbell-rear-lateral-raise-bent-over',
    name: 'Dumbbell Rear Lateral Raise (Bent-Over)',
    load: 'dumbbell',
    repRange: [6, 8],
    muscle: 'shoulders',
  },

  // ---- Biceps -------------------------------------------------------------
  {
    slug: 'barbell-curl',
    name: 'Barbell Curl',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'biceps',
  },
  {
    slug: 'ez-bar-curl',
    name: 'E-Z Bar Curl',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'biceps',
  },
  {
    slug: 'dumbbell-hammer-curl',
    name: 'Dumbbell Hammer Curl',
    load: 'dumbbell',
    repRange: [4, 6],
    muscle: 'biceps',
  },
  {
    slug: 'alternating-dumbbell-curl',
    name: 'Alternating Dumbbell Curl',
    load: 'dumbbell',
    repRange: [4, 6],
    muscle: 'biceps',
  },

  // ---- Legs ---------------------------------------------------------------
  {
    slug: 'barbell-squat',
    name: 'Barbell Squat',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'quads',
    cue: 'Break at the hips, knees tracking over the toes.',
  },
  {
    slug: 'leg-press',
    name: 'Leg Press',
    load: 'machine',
    repRange: [4, 6],
    muscle: 'quads',
  },
  {
    slug: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'hamstrings',
  },
  {
    slug: 'leg-curl',
    name: 'Leg Curl (Lying or Seated)',
    load: 'machine',
    repRange: [6, 8],
    muscle: 'hamstrings',
  },
  {
    slug: 'dumbbell-lunge-in-place',
    name: 'Dumbbell Lunge (In-Place)',
    load: 'dumbbell',
    repRange: [4, 6],
    muscle: 'quads',
    cue: 'Reps are per leg.',
  },
  {
    slug: 'dumbbell-lunge-reverse',
    name: 'Dumbbell Lunge (Reverse)',
    load: 'dumbbell',
    repRange: [4, 6],
    muscle: 'quads',
    cue: 'Reps are per leg.',
  },
  {
    slug: 'barbell-lunge-walking',
    name: 'Barbell Lunge (Walking)',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'quads',
    cue: 'Reps are per leg.',
  },
  {
    slug: 'dumbbell-single-leg-split-squat',
    name: 'Dumbbell Single-Leg Split Squat',
    load: 'dumbbell',
    repRange: [4, 6],
    muscle: 'quads',
    cue: 'Reps are per leg.',
  },
  {
    slug: 'barbell-single-leg-split-squat',
    name: 'Barbell Single-Leg Split Squat',
    load: 'barbell',
    repRange: [4, 6],
    muscle: 'quads',
    cue: 'Reps are per leg.',
  },

  // ---- Calves -------------------------------------------------------------
  {
    slug: 'leg-press-calf-raise',
    name: 'Leg Press Calf Raise',
    load: 'machine',
    repRange: [6, 8],
    muscle: 'calves',
  },
  {
    slug: 'seated-calf-raise',
    name: 'Seated Calf Raise',
    load: 'machine',
    repRange: [6, 8],
    muscle: 'calves',
  },
  {
    slug: 'standing-calf-raise',
    name: 'Standing Calf Raise',
    load: 'machine',
    repRange: [6, 8],
    muscle: 'calves',
  },

  // ---- Core ---------------------------------------------------------------
  {
    slug: 'cable-crunch',
    name: 'Cable Crunch',
    load: 'cable',
    repRange: [8, 10],
    muscle: 'core',
  },
  {
    slug: 'captains-chair-leg-raise',
    name: 'Captain’s Chair Leg Raise',
    load: 'bodyweight',
    repRange: [8, 12],
    muscle: 'core',
  },
  {
    slug: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    load: 'bodyweight',
    repRange: [8, 12],
    muscle: 'core',
  },
  {
    slug: 'lying-leg-raise',
    name: 'Lying Leg Raise',
    load: 'bodyweight',
    repRange: [8, 12],
    muscle: 'core',
  },
  {
    slug: 'weighted-sit-up',
    name: 'Weighted Sit-Up',
    load: 'bodyweight_plus',
    repRange: [8, 10],
    muscle: 'core',
  },
  {
    slug: 'abdominal-rollout',
    name: 'Abdominal Rollout',
    load: 'bodyweight',
    repRange: [8, 12],
    muscle: 'core',
  },
  {
    slug: 'plank',
    name: 'Plank',
    load: 'time',
    repRange: [45, 60],
    muscle: 'core',
    cue: 'Tracked in seconds. Squeeze glutes, ribs down.',
  },
];

export const EXERCISES: Record<string, Exercise> = Object.fromEntries(
  list.map((e) => [e.slug, e]),
);

export const ALL_EXERCISES = list;

export function getExercise(slug: string): Exercise {
  const found = EXERCISES[slug];
  if (!found) throw new Error(`Unknown exercise: ${slug}`);
  return found;
}

export const MUSCLE_LABELS: Record<Exercise['muscle'], string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  core: 'Core',
};
