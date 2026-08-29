import type { Phase, ProgramSlot, Workout } from './types';

/**
 * The Bigger Leaner Stronger 5-day routine, transcribed from the Legion
 * Athletics PDF.
 *
 * Structure: six phases. Each phase runs for TRAINING_WEEKS weeks of five
 * workouts, then a deload week of three workouts. The deload week is identical
 * after every phase, so it is defined once.
 */

export const TRAINING_WEEKS = 4;
export const DELOAD_WEEK = TRAINING_WEEKS + 1; // week 5
export const TOTAL_PHASES = 6;

/** 3 hard sets, no warm-up ramp. */
const s = (slug: string): ProgramSlot => ({ slug, sets: 3 });
/** Warm-up ramp + 3 hard sets. */
const w = (slug: string): ProgramSlot => ({ slug, sets: 3, warmup: true });
/** Deload: 2 sets of 3 reps at the last hard-set weight. */
const d = (slug: string, warmup = false): ProgramSlot => ({ slug, sets: 2, warmup });

function phase(number: number, workouts: Omit<Workout, 'id'>[]): Phase {
  return {
    number,
    workouts: workouts.map((wk) => ({ ...wk, id: `p${number}-w${wk.index}` })),
  };
}

export const PHASES: Phase[] = [
  phase(1, [
    {
      index: 1,
      name: 'Push',
      slots: [
        w('barbell-bench-press'),
        s('incline-barbell-bench-press'),
        s('dumbbell-bench-press'),
        s('triceps-pushdown'),
      ],
    },
    {
      index: 2,
      name: 'Pull and Calves',
      slots: [
        w('barbell-deadlift'),
        s('one-arm-dumbbell-row'),
        s('lat-pulldown-wide'),
        s('leg-press-calf-raise'),
      ],
    },
    {
      index: 3,
      name: 'Upper Body and Core',
      slots: [
        w('seated-dumbbell-press'),
        s('dumbbell-side-lateral-raise'),
        s('dumbbell-rear-lateral-raise-seated'),
        s('cable-crunch'),
      ],
    },
    {
      index: 4,
      name: 'Legs',
      slots: [
        w('barbell-squat'),
        s('leg-press'),
        s('leg-curl'),
        s('seated-calf-raise'),
      ],
    },
    {
      index: 5,
      name: 'Upper Body and Core',
      slots: [
        w('close-grip-bench-press'),
        w('barbell-curl'),
        s('seated-triceps-press'),
        s('dumbbell-hammer-curl'),
        s('captains-chair-leg-raise'),
      ],
    },
  ]),

  phase(2, [
    {
      index: 1,
      name: 'Push',
      slots: [
        w('incline-barbell-bench-press'),
        s('barbell-bench-press'),
        s('incline-dumbbell-bench-press'),
        s('lying-triceps-extension'),
      ],
    },
    {
      index: 2,
      name: 'Pull and Calves',
      slots: [
        w('barbell-deadlift'),
        s('seated-cable-row-wide'),
        s('lat-pulldown-close'),
        s('seated-calf-raise'),
      ],
    },
    {
      index: 3,
      name: 'Upper Body and Core',
      slots: [
        w('arnold-dumbbell-press'),
        s('barbell-rear-delt-row'),
        s('dumbbell-side-lateral-raise'),
        s('captains-chair-leg-raise'),
      ],
    },
    {
      index: 4,
      name: 'Legs',
      slots: [
        w('barbell-squat'),
        s('romanian-deadlift'),
        s('dumbbell-lunge-in-place'),
        s('standing-calf-raise'),
      ],
    },
    {
      index: 5,
      name: 'Upper Body and Core',
      slots: [
        w('dip'),
        w('dumbbell-hammer-curl'),
        s('triceps-pushdown'),
        s('barbell-curl'),
        s('plank'),
      ],
    },
  ]),

  phase(3, [
    {
      index: 1,
      name: 'Push',
      slots: [
        w('barbell-bench-press'),
        s('incline-barbell-bench-press'),
        s('dumbbell-bench-press'),
        s('triceps-pushdown'),
      ],
    },
    {
      index: 2,
      name: 'Pull and Calves',
      slots: [
        w('barbell-deadlift'),
        s('barbell-row'),
        s('chin-up'),
        s('standing-calf-raise'),
      ],
    },
    {
      index: 3,
      name: 'Upper Body and Core',
      slots: [
        w('seated-dumbbell-press'),
        s('dumbbell-side-lateral-raise'),
        s('dumbbell-rear-lateral-raise-bent-over'),
        s('plank'),
      ],
    },
    {
      index: 4,
      name: 'Legs',
      slots: [
        w('barbell-squat'),
        s('dumbbell-lunge-reverse'),
        s('leg-curl'),
        s('leg-press-calf-raise'),
      ],
    },
    {
      index: 5,
      name: 'Upper Body and Core',
      slots: [
        w('close-grip-bench-press'),
        w('ez-bar-curl'),
        s('seated-triceps-press'),
        s('dumbbell-hammer-curl'),
        s('weighted-sit-up'),
      ],
    },
  ]),

  phase(4, [
    {
      index: 1,
      name: 'Push',
      slots: [
        w('incline-barbell-bench-press'),
        s('barbell-bench-press'),
        s('incline-dumbbell-bench-press'),
        s('lying-triceps-extension'),
      ],
    },
    {
      index: 2,
      name: 'Pull and Calves',
      slots: [
        w('barbell-deadlift'),
        s('one-arm-dumbbell-row'),
        s('lat-pulldown-wide'),
        s('leg-press-calf-raise'),
      ],
    },
    {
      index: 3,
      name: 'Upper Body and Core',
      slots: [
        w('arnold-dumbbell-press'),
        s('barbell-rear-delt-row'),
        s('dumbbell-side-lateral-raise'),
        s('weighted-sit-up'),
      ],
    },
    {
      index: 4,
      name: 'Legs',
      slots: [
        w('barbell-squat'),
        s('romanian-deadlift'),
        s('dumbbell-single-leg-split-squat'),
        s('seated-calf-raise'),
      ],
    },
    {
      index: 5,
      name: 'Upper Body and Core',
      slots: [
        w('dip'),
        w('alternating-dumbbell-curl'),
        s('triceps-pushdown'),
        s('ez-bar-curl'),
        s('hanging-leg-raise'),
      ],
    },
  ]),

  phase(5, [
    {
      index: 1,
      name: 'Push',
      slots: [
        w('barbell-bench-press'),
        s('incline-barbell-bench-press'),
        s('dumbbell-bench-press'),
        s('triceps-pushdown'),
      ],
    },
    {
      index: 2,
      name: 'Pull and Calves',
      slots: [
        w('barbell-deadlift'),
        s('seated-cable-row-close'),
        s('lat-pulldown-close'),
        s('seated-calf-raise'),
      ],
    },
    {
      index: 3,
      name: 'Upper Body and Core',
      slots: [
        w('seated-dumbbell-press'),
        s('dumbbell-side-lateral-raise'),
        s('barbell-rear-delt-row'),
        s('lying-leg-raise'),
      ],
    },
    {
      index: 4,
      name: 'Legs',
      slots: [
        w('barbell-squat'),
        s('barbell-single-leg-split-squat'),
        s('leg-curl'),
        s('standing-calf-raise'),
      ],
    },
    {
      index: 5,
      name: 'Upper Body and Core',
      slots: [
        w('close-grip-bench-press'),
        w('barbell-curl'),
        s('seated-triceps-press'),
        s('alternating-dumbbell-curl'),
        s('abdominal-rollout'),
      ],
    },
  ]),

  phase(6, [
    {
      index: 1,
      name: 'Push',
      slots: [
        w('incline-barbell-bench-press'),
        s('barbell-bench-press'),
        s('incline-dumbbell-bench-press'),
        s('lying-triceps-extension'),
      ],
    },
    {
      index: 2,
      name: 'Pull and Calves',
      slots: [
        w('barbell-deadlift'),
        s('barbell-row'),
        s('pull-up'),
        s('standing-calf-raise'),
      ],
    },
    {
      index: 3,
      name: 'Upper Body and Core',
      slots: [
        w('arnold-dumbbell-press'),
        s('barbell-rear-delt-row'),
        s('dumbbell-side-lateral-raise'),
        s('abdominal-rollout'),
      ],
    },
    {
      index: 4,
      name: 'Legs',
      slots: [
        w('barbell-squat'),
        s('romanian-deadlift'),
        s('barbell-lunge-walking'),
        s('leg-press-calf-raise'),
      ],
    },
    {
      index: 5,
      name: 'Upper Body and Core',
      slots: [
        w('dip'),
        w('dumbbell-hammer-curl'),
        s('triceps-pushdown'),
        s('barbell-curl'),
        s('weighted-sit-up'),
      ],
    },
  ]),
];

/**
 * The deload week. Identical after every phase: two sets of three reps at the
 * last hard-set weight.
 */
export const DELOAD_WORKOUTS: Workout[] = [
  {
    id: 'deload-w1',
    index: 1,
    name: 'Deload Push',
    slots: [
      d('barbell-bench-press', true),
      d('incline-barbell-bench-press'),
      d('dumbbell-bench-press'),
    ],
  },
  {
    id: 'deload-w2',
    index: 2,
    name: 'Deload Pull',
    slots: [d('barbell-deadlift', true), d('barbell-row'), d('lat-pulldown-wide')],
  },
  {
    id: 'deload-w3',
    index: 3,
    name: 'Deload Legs',
    slots: [d('barbell-squat', true), d('leg-press'), d('leg-curl')],
  },
];

/** Reps per set during a deload week. */
export const DELOAD_REPS = 3;

export function isDeloadWeek(week: number): boolean {
  return week === DELOAD_WEEK;
}

export function getPhase(phaseNumber: number): Phase {
  const found = PHASES.find((p) => p.number === phaseNumber);
  if (!found) throw new Error(`Unknown phase: ${phaseNumber}`);
  return found;
}

/** The workouts scheduled for a given phase + week. */
export function getWorkoutsFor(phaseNumber: number, week: number): Workout[] {
  return isDeloadWeek(week) ? DELOAD_WORKOUTS : getPhase(phaseNumber).workouts;
}

export function getWorkout(
  phaseNumber: number,
  week: number,
  workoutIndex: number,
): Workout | undefined {
  return getWorkoutsFor(phaseNumber, week).find((wk) => wk.index === workoutIndex);
}

/** Human label, e.g. "Phase 3 · Week 2" or "Phase 3 · Deload". */
export function periodLabel(phaseNumber: number, week: number): string {
  return isDeloadWeek(week)
    ? `Phase ${phaseNumber} · Deload`
    : `Phase ${phaseNumber} · Week ${week}`;
}
