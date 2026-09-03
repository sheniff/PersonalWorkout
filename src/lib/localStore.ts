import type { AppData, Progress, Settings } from '../data/types';

const KEY = 'pw:data:v1';
const ACTIVE_KEY = 'pw:active-session:v1';

export const DEFAULT_PROGRESS: Progress = {
  block: 1,
  phase: 1,
  week: 1,
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_SETTINGS: Settings = {
  unit: 'kg',
  restHard: 180,
  restWarmup: 60,
  autoStartRest: true,
  keepScreenAwake: true,
  showWarmups: true,
  barWeight: 20,
  platesKg: [25, 20, 15, 10, 5, 2.5, 1.25],
  platesLb: [45, 35, 25, 10, 5, 2.5],
  substitutions: {},
};

export function emptyData(): AppData {
  return {
    progress: { ...DEFAULT_PROGRESS },
    settings: { ...DEFAULT_SETTINGS },
    exerciseStates: {},
    sessions: [],
  };
}

export function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      progress: { ...DEFAULT_PROGRESS, ...(parsed.progress ?? {}) },
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      exerciseStates: parsed.exerciseStates ?? {},
      sessions: parsed.sessions ?? [],
    };
  } catch {
    return emptyData();
  }
}

export function saveLocal(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Quota errors are not worth interrupting a workout for.
  }
}

/** The in-progress workout is kept separately so a refresh never loses it. */
export function loadActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveSessionId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}
