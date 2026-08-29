import type { LoadType, Unit } from '../data/types';

const LB_PER_KG = 2.20462262;

export function convertWeight(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  return from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG;
}

/**
 * Smallest sensible jump for the stepper. Barbells go up in plate pairs,
 * dumbbells and stacks in whatever the gym has.
 */
export function increment(load: LoadType, unit: Unit): number {
  if (unit === 'lb') {
    switch (load) {
      case 'barbell':
        return 5;
      case 'dumbbell':
        return 5;
      case 'machine':
      case 'cable':
        return 5;
      case 'bodyweight_plus':
        return 5;
      default:
        return 5;
    }
  }
  switch (load) {
    case 'barbell':
      return 2.5;
    case 'dumbbell':
      return 2;
    case 'machine':
    case 'cable':
      return 2.5;
    case 'bodyweight_plus':
      return 2.5;
    default:
      return 2.5;
  }
}

/** Progression jump when the top of the rep range is hit. */
export function progressionStep(load: LoadType, unit: Unit): number {
  // The program's rule of thumb: add ~10 lb / 5 kg to the big barbell lifts,
  // less on isolation work where the jump would be a huge relative increase.
  const base = increment(load, unit);
  if (load === 'barbell' || load === 'machine') return base * 2;
  return base;
}

export function roundToIncrement(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

/** Weight is only meaningful for some exercises. */
export function usesWeight(load: LoadType): boolean {
  return load !== 'bodyweight' && load !== 'time';
}

/** Bodyweight movements where extra plates are optional. */
export function isAddedWeight(load: LoadType): boolean {
  return load === 'bodyweight_plus';
}

export function isTimed(load: LoadType): boolean {
  return load === 'time';
}

export function formatWeight(value: number | null, unit: Unit): string {
  if (value == null) return '—';
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${unit}`;
}

export function formatWeightNumber(value: number | null): string {
  if (value == null) return '—';
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Epley estimated one-rep max — used for PRs and progress charts. */
export function estimate1rm(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}
