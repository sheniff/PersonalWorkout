export type Unit = 'kg' | 'lb';

/**
 * How an exercise is loaded. This drives whether we show a weight stepper at
 * all, what increment the stepper uses, and how we display the target.
 */
export type LoadType =
  | 'barbell'
  | 'dumbbell' // weight entered per dumbbell
  | 'machine'
  | 'cable'
  | 'bodyweight' // no weight field
  | 'bodyweight_plus' // optional *added* weight (dips, chin-ups, weighted sit-ups)
  | 'time'; // tracked in seconds instead of reps (planks)

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'core';

export interface Exercise {
  slug: string;
  name: string;
  load: LoadType;
  /** Target rep range for a hard set. `time` exercises use seconds. */
  repRange: [number, number];
  muscle: MuscleGroup;
  /** Short cue shown in the session screen. */
  cue?: string;
}

/** One exercise slot inside a workout. */
export interface ProgramSlot {
  slug: string;
  /** Number of hard sets (deload workouts use 2). */
  sets: number;
  /** Whether this slot starts with the warm-up ramp. */
  warmup?: boolean;
}

export interface Workout {
  /** Stable id, e.g. `p3-w2` or `deload-w1`. */
  id: string;
  /** 1-based index within its week. */
  index: number;
  name: string;
  slots: ProgramSlot[];
}

export interface Phase {
  number: number;
  workouts: Workout[];
}

export type SetKind = 'warmup' | 'hard';

export interface SetLog {
  id: string;
  exerciseSlug: string;
  /** Order of this set within the exercise (0-based, warm-ups first). */
  order: number;
  kind: SetKind;
  /** What the app suggested, kept so we can show "vs target" later. */
  targetReps: number;
  targetWeight: number | null;
  /** What actually happened. `null` until the set is completed. */
  reps: number | null;
  weight: number | null;
  unit: Unit;
  completed: boolean;
  completedAt: string | null;
}

export interface Session {
  id: string;
  phase: number;
  /** 1–4 = training weeks, 5 = deload week. */
  week: number;
  /** Full pass through phases 1–6; lets you repeat the program. */
  block: number;
  isDeload: boolean;
  workoutId: string;
  workoutName: string;
  workoutIndex: number;
  startedAt: string;
  completedAt: string | null;
  notes: string;
  sets: SetLog[];
  updatedAt: string;
}

/** Rolling per-exercise memory that drives the next suggestion. */
export interface ExerciseState {
  slug: string;
  /** Last weight used on a hard set (never updated by deload sets). */
  lastWeight: number | null;
  /** Last rep count the user actually selected on a hard set. */
  lastReps: number | null;
  unit: Unit;
  /** Best estimated 1RM seen, for the PR badge. */
  bestE1rm: number | null;
  updatedAt: string;
}

export interface Progress {
  block: number;
  phase: number;
  /** 1–4 training, 5 deload. */
  week: number;
  updatedAt: string;
}

export interface Settings {
  unit: Unit;
  /** Rest between hard sets, seconds. */
  restHard: number;
  /** Rest between warm-up sets, seconds. */
  restWarmup: number;
  autoStartRest: boolean;
  keepScreenAwake: boolean;
  /** Show the warm-up ramp expanded by default. */
  showWarmups: boolean;
  /** Weight of an empty barbell, for the plate breakdown. */
  barWeight: number;
  /** Plate denominations available, heaviest first. Per unit. */
  platesKg: number[];
  platesLb: number[];
  /**
   * Swapped-in exercises, keyed by `<workoutId>:<slotIndex>` — the slot rather
   * than the exercise, so a swap sticks to that position in that workout only.
   */
  substitutions: Record<string, string>;
}

export interface AppData {
  progress: Progress;
  settings: Settings;
  exerciseStates: Record<string, ExerciseState>;
  sessions: Session[];
}
