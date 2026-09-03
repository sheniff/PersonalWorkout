import type { LoadType, Settings, Unit } from '../data/types';

export interface PlateLoad {
  /** Plates for ONE side, heaviest first. */
  perSide: { plate: number; count: number }[];
  /** True when the bar alone already makes the weight. */
  barOnly: boolean;
  /** What the listed plates actually add up to, bar included. */
  achievable: number;
  /** Set when the plates cannot make the target exactly. */
  shortBy: number;
}

/** Only a loaded barbell has plates to work out. */
export function hasPlateLoad(load: LoadType): boolean {
  return load === 'barbell';
}

export function platesFor(unit: Unit, settings: Settings): number[] {
  const list = unit === 'kg' ? settings.platesKg : settings.platesLb;
  return [...list].filter((p) => p > 0).sort((a, b) => b - a);
}

/**
 * Greedy from the heaviest plate down. Gyms stock plates in denominations where
 * greedy is optimal, and it matches how anyone actually loads a bar.
 */
export function calculatePlates(
  target: number,
  barWeight: number,
  plates: number[],
): PlateLoad | null {
  if (!Number.isFinite(target) || target < barWeight) return null;

  const perSideTarget = (target - barWeight) / 2;
  if (perSideTarget <= 0) {
    return { perSide: [], barOnly: true, achievable: barWeight, shortBy: 0 };
  }

  const perSide: { plate: number; count: number }[] = [];
  let remaining = perSideTarget;

  for (const plate of plates) {
    // Guard against floating point: 0.0001 short should still take the plate.
    const count = Math.floor((remaining + 1e-6) / plate);
    if (count > 0) {
      perSide.push({ plate, count });
      remaining -= count * plate;
    }
  }

  const loaded = perSideTarget - remaining;
  return {
    perSide,
    barOnly: perSide.length === 0,
    achievable: barWeight + loaded * 2,
    shortBy: remaining < 1e-6 ? 0 : remaining * 2,
  };
}

/** "20 + 10 + 2.5" — one side of the bar, as you would load it. */
export function formatPlates(load: PlateLoad): string {
  if (load.barOnly) return 'Just the bar';
  return load.perSide
    .flatMap(({ plate, count }) => Array.from({ length: count }, () => trim(plate)))
    .join(' + ');
}

function trim(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}
