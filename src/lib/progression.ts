import { getExercise } from '../data/exercises';
import {
  DELOAD_REPS,
  DELOAD_WEEK,
  TOTAL_PHASES,
  TRAINING_WEEKS,
  getWorkout,
  getWorkoutsFor,
  isDeloadWeek,
} from '../data/program';
import type {
  Exercise,
  ExerciseState,
  Progress,
  Session,
  SetKind,
  SetLog,
  Settings,
  Unit,
  Workout,
} from '../data/types';
import { uid } from './format';
import {
  convertWeight,
  increment,
  isTimed,
  progressionStep,
  roundToIncrement,
  usesWeight,
} from './units';

export interface PlannedSet {
  kind: SetKind;
  reps: number;
  weight: number | null;
  /** Shown next to warm-up sets, e.g. "50%". */
  note?: string;
}

/**
 * The warm-up ramp from the program: two light sets, one moderate, one heavy
 * single, all relative to the first hard set's weight.
 */
const RAMP: { reps: number; pct: number }[] = [
  { reps: 12, pct: 0.5 },
  { reps: 10, pct: 0.5 },
  { reps: 4, pct: 0.7 },
  { reps: 1, pct: 0.9 },
];

export function buildWarmups(
  exercise: Exercise,
  workingWeight: number | null,
  unit: Unit,
): PlannedSet[] {
  // Bodyweight and timed movements get a couple of easy sets instead of a
  // percentage ramp — there is nothing to load.
  if (!usesWeight(exercise.load) || exercise.load === 'bodyweight_plus') {
    if (isTimed(exercise.load)) {
      return [{ kind: 'warmup', reps: 20, weight: null, note: 'easy' }];
    }
    return [
      { kind: 'warmup', reps: 8, weight: exercise.load === 'bodyweight_plus' ? 0 : null, note: 'bodyweight' },
    ];
  }

  const step = increment(exercise.load, unit);
  return RAMP.map(({ reps, pct }) => ({
    kind: 'warmup' as const,
    reps,
    weight:
      workingWeight == null
        ? null
        : Math.max(step, roundToIncrement(workingWeight * pct, step)),
    note: `${Math.round(pct * 100)}%`,
  }));
}

/**
 * What the app suggests for the next hard set of an exercise.
 *
 * Double progression: once the top of the rep range is reached, the weight goes
 * up and the rep target drops back to the bottom of the range. Otherwise the
 * last values the user actually selected carry forward untouched.
 */
/**
 * The last weight used, in the unit the app is currently showing. Converting
 * kg to lb lands on values no gym has plates for, so a converted number is
 * snapped back to a loadable increment; a number already in the right unit is
 * left exactly as the user entered it.
 */
function carriedWeight(
  exercise: Exercise,
  state: ExerciseState | undefined,
  unit: Unit,
): number | null {
  if (!state || state.lastWeight == null) return null;
  if (state.unit === unit) return state.lastWeight;
  return roundToIncrement(
    convertWeight(state.lastWeight, state.unit, unit),
    increment(exercise.load, unit),
  );
}

export function suggestHardSet(
  exercise: Exercise,
  state: ExerciseState | undefined,
  unit: Unit,
): { reps: number; weight: number | null } {
  const [min, max] = exercise.repRange;
  const lastWeight = carriedWeight(exercise, state, unit);

  if (!state || state.lastReps == null) {
    return { reps: min, weight: lastWeight };
  }

  if (state.lastReps >= max) {
    if (lastWeight == null || !usesWeight(exercise.load)) {
      // Nothing to load: push the rep target up instead.
      return { reps: state.lastReps + (isTimed(exercise.load) ? 5 : 1), weight: lastWeight };
    }
    const step = progressionStep(exercise.load, unit);
    return {
      reps: min,
      weight: roundToIncrement(lastWeight + step, increment(exercise.load, unit)),
    };
  }

  return { reps: Math.min(Math.max(state.lastReps, min), max), weight: lastWeight };
}

/** Deload sets: fixed low reps at the last hard-set weight, no progression. */
function suggestDeloadSet(
  exercise: Exercise,
  state: ExerciseState | undefined,
  unit: Unit,
): { reps: number; weight: number | null } {
  return {
    reps: isTimed(exercise.load) ? exercise.repRange[0] : DELOAD_REPS,
    weight: carriedWeight(exercise, state, unit),
  };
}

export function planWorkout(
  workout: Workout,
  isDeload: boolean,
  states: Record<string, ExerciseState>,
  unit: Unit,
  includeWarmups: boolean,
): SetLog[] {
  const sets: SetLog[] = [];
  // Session-global, not per-exercise: `order` is what the sets come back sorted
  // by after a sync, so restarting it per exercise interleaved them.
  let order = 0;

  for (const slot of workout.slots) {
    const exercise = getExercise(slot.slug);
    const state = states[slot.slug];
    const suggestion = isDeload
      ? suggestDeloadSet(exercise, state, unit)
      : suggestHardSet(exercise, state, unit);

    const push = (planned: PlannedSet) => {
      sets.push({
        id: uid(),
        exerciseSlug: slot.slug,
        order: order++,
        kind: planned.kind,
        targetReps: planned.reps,
        targetWeight: planned.weight,
        reps: planned.reps,
        weight: planned.weight,
        unit,
        completed: false,
        completedAt: null,
      });
    };

    if (slot.warmup && includeWarmups) {
      for (const wu of buildWarmups(exercise, suggestion.weight, unit)) push(wu);
    }
    for (let i = 0; i < slot.sets; i += 1) {
      push({ kind: 'hard', reps: suggestion.reps, weight: suggestion.weight });
    }
  }

  return sets;
}

export interface SetEntry {
  set: SetLog;
  /** Position in `session.sets`, which is what the edit helpers address. */
  index: number;
}

export interface SetGroup {
  slug: string;
  entries: SetEntry[];
}

function sortEntries(entries: SetEntry[]): SetEntry[] {
  return [...entries].sort((a, b) => {
    if (a.set.kind !== b.set.kind) return a.set.kind === 'warmup' ? -1 : 1;
    return a.index - b.index;
  });
}

/**
 * Sets grouped by exercise, in the order the program lists them.
 *
 * Deliberately *not* "consecutive runs of the same slug". A synced session
 * arrives sorted by `set_order`, and sessions written before that counter was
 * session-global carry one sequence per exercise — which interleaves the
 * exercises and shatters an adjacency-based grouping into one group per set.
 * Bucketing by slug reads those sessions correctly without a migration.
 *
 * Within a bucket the stored order still holds: sorting the whole array by
 * `set_order` leaves each exercise's own sets ascending among themselves.
 *
 * No workout in this program lists the same exercise twice; if one ever did,
 * its sets would merge into a single group.
 */
export function groupSets(session: Session): SetGroup[] {
  const buckets = new Map<string, SetEntry[]>();
  session.sets.forEach((set, index) => {
    const bucket = buckets.get(set.exerciseSlug);
    if (bucket) bucket.push({ set, index });
    else buckets.set(set.exerciseSlug, [{ set, index }]);
  });

  const planned = getWorkout(session.phase, session.week, session.workoutIndex);
  const groups: SetGroup[] = [];
  const placed = new Set<string>();

  for (const slot of planned?.slots ?? []) {
    const entries = buckets.get(slot.slug);
    if (!entries || placed.has(slot.slug)) continue;
    placed.add(slot.slug);
    groups.push({ slug: slot.slug, entries: sortEntries(entries) });
  }

  // Anything the program no longer lists still gets shown, in first-seen order.
  for (const [slug, entries] of buckets) {
    if (placed.has(slug)) continue;
    groups.push({ slug, entries: sortEntries(entries) });
  }

  return groups;
}

export function createSession(
  progress: Progress,
  workout: Workout,
  states: Record<string, ExerciseState>,
  settings: Settings,
): Session {
  const deload = isDeloadWeek(progress.week);
  const now = new Date().toISOString();
  return {
    id: uid(),
    phase: progress.phase,
    week: progress.week,
    block: progress.block,
    isDeload: deload,
    workoutId: workout.id,
    workoutName: workout.name,
    workoutIndex: workout.index,
    startedAt: now,
    completedAt: null,
    notes: '',
    sets: planWorkout(workout, deload, states, settings.unit, settings.showWarmups),
    updatedAt: now,
  };
}

/**
 * Carry a value the user just typed forward to the not-yet-done sets of the
 * same exercise, so a correction only has to be made once.
 */
export function propagateEdit(
  sets: SetLog[],
  fromIndex: number,
  patch: Partial<Pick<SetLog, 'reps' | 'weight'>>,
): SetLog[] {
  const source = sets[fromIndex];
  if (!source) return sets;
  return sets.map((set, i) => {
    if (i === fromIndex) return { ...set, ...patch };
    if (i < fromIndex) return set;
    if (set.exerciseSlug !== source.exerciseSlug) return set;
    if (set.kind !== source.kind) return set;
    if (set.completed) return set;
    return { ...set, ...patch };
  });
}

/**
 * Re-derive the warm-up ramp once the working weight is known. Without this the
 * first ever session of a lift shows blank warm-up sets, because there was no
 * history to build the percentages from when the workout was planned.
 */
export function recomputeWarmups(
  sets: SetLog[],
  exerciseSlug: string,
  workingWeight: number | null,
  unit: Unit,
): SetLog[] {
  const exercise = getExercise(exerciseSlug);
  const ramp = buildWarmups(exercise, workingWeight, unit);

  let seen = 0;
  return sets.map((set) => {
    if (set.exerciseSlug !== exerciseSlug || set.kind !== 'warmup') return set;
    const planned = ramp[seen];
    seen += 1;
    if (!planned || set.completed) return set;
    return { ...set, weight: planned.weight, targetWeight: planned.weight };
  });
}

/**
 * After a hard set is logged, adjust the remaining sets of that exercise: if
 * the top of the range was hit, the next set goes up in weight and back to the
 * bottom of the range.
 */
export function applyProgressionWithinSession(
  sets: SetLog[],
  completedIndex: number,
  unit: Unit,
): SetLog[] {
  const done = sets[completedIndex];
  if (!done || done.kind !== 'hard' || done.reps == null) return sets;

  const exercise = getExercise(done.exerciseSlug);
  const [min, max] = exercise.repRange;
  const hitTop = done.reps >= max;

  let nextWeight = done.weight;
  let nextReps = done.reps;

  if (hitTop && done.weight != null && usesWeight(exercise.load)) {
    const step = progressionStep(exercise.load, unit);
    nextWeight = roundToIncrement(done.weight + step, increment(exercise.load, unit));
    nextReps = min;
  }

  return sets.map((set, i) => {
    if (i <= completedIndex) return set;
    if (set.exerciseSlug !== done.exerciseSlug) return set;
    if (set.kind !== 'hard' || set.completed) return set;
    return { ...set, reps: nextReps, weight: nextWeight };
  });
}

/**
 * Fold a finished session into the rolling per-exercise memory. Deload work is
 * logged but deliberately does not move the needle.
 */
export function updateExerciseStates(
  session: Session,
  states: Record<string, ExerciseState>,
): Record<string, ExerciseState> {
  if (session.isDeload) return states;

  const next = { ...states };
  const now = new Date().toISOString();

  for (const set of session.sets) {
    if (!set.completed || set.kind !== 'hard' || set.reps == null) continue;

    const previous = next[set.exerciseSlug];
    const e1rm =
      set.weight != null && set.weight > 0 ? set.weight * (1 + set.reps / 30) : null;
    const previousBest =
      previous?.bestE1rm != null
        ? convertWeight(previous.bestE1rm, previous.unit, set.unit)
        : null;

    next[set.exerciseSlug] = {
      slug: set.exerciseSlug,
      // Later sets overwrite earlier ones, so the last thing the user selected
      // is what seeds the next workout.
      lastWeight: set.weight,
      lastReps: set.reps,
      unit: set.unit,
      bestE1rm:
        e1rm == null
          ? previousBest
          : previousBest == null
            ? e1rm
            : Math.max(previousBest, e1rm),
      updatedAt: now,
    };
  }

  return next;
}

// ---------------------------------------------------------------------------
// Program position
// ---------------------------------------------------------------------------

export function advanceProgress(progress: Progress): Progress {
  const now = new Date().toISOString();
  if (progress.week < DELOAD_WEEK) {
    return { ...progress, week: progress.week + 1, updatedAt: now };
  }
  // Deload finished: on to the next phase, or a fresh pass through the program.
  if (progress.phase < TOTAL_PHASES) {
    return { ...progress, phase: progress.phase + 1, week: 1, updatedAt: now };
  }
  return { block: progress.block + 1, phase: 1, week: 1, updatedAt: now };
}

export function rewindProgress(progress: Progress): Progress {
  const now = new Date().toISOString();
  if (progress.week > 1) return { ...progress, week: progress.week - 1, updatedAt: now };
  if (progress.phase > 1) {
    return { ...progress, phase: progress.phase - 1, week: DELOAD_WEEK, updatedAt: now };
  }
  if (progress.block > 1) {
    return { block: progress.block - 1, phase: TOTAL_PHASES, week: DELOAD_WEEK, updatedAt: now };
  }
  return progress;
}

/** Workout indexes already completed in the current phase + week. */
export function completedWorkoutIndexes(
  sessions: Session[],
  progress: Progress,
): Set<number> {
  const done = new Set<number>();
  for (const session of sessions) {
    if (!session.completedAt) continue;
    if (
      session.block === progress.block &&
      session.phase === progress.phase &&
      session.week === progress.week
    ) {
      done.add(session.workoutIndex);
    }
  }
  return done;
}

/** The next workout to do: the first one this week that has not been logged. */
export function nextWorkout(sessions: Session[], progress: Progress): Workout | undefined {
  const workouts = getWorkoutsFor(progress.phase, progress.week);
  const done = completedWorkoutIndexes(sessions, progress);
  return workouts.find((w) => !done.has(w.index)) ?? workouts[0];
}

export function isWeekComplete(sessions: Session[], progress: Progress): boolean {
  const workouts = getWorkoutsFor(progress.phase, progress.week);
  const done = completedWorkoutIndexes(sessions, progress);
  return workouts.every((w) => done.has(w.index));
}

/** 0–1 progress through the whole six-phase block. */
export function blockProgress(progress: Progress): number {
  const weeksPerPhase = TRAINING_WEEKS + 1;
  const completed = (progress.phase - 1) * weeksPerPhase + (progress.week - 1);
  return completed / (TOTAL_PHASES * weeksPerPhase);
}

export function sessionVolume(session: Session): number {
  return session.sets.reduce((total, set) => {
    if (!set.completed || set.kind !== 'hard') return total;
    if (set.weight == null || set.reps == null) return total;
    return total + set.weight * set.reps;
  }, 0);
}

export function sessionDurationSeconds(session: Session): number {
  if (!session.completedAt) return 0;
  return (
    (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
  );
}

export function completedHardSets(session: Session): number {
  return session.sets.filter((s) => s.completed && s.kind === 'hard').length;
}
