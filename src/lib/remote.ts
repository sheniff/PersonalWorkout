import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData, ExerciseState, Progress, Session, SetLog, Settings } from '../data/types';
import { DEFAULT_PROGRESS, DEFAULT_SETTINGS } from './localStore';

/**
 * Row shapes mirror supabase/schema.sql. Everything is scoped by user_id and
 * protected by row-level security, so the anon key is safe in the client.
 */

interface SessionRow {
  id: string;
  user_id: string;
  block: number;
  phase: number;
  week: number;
  is_deload: boolean;
  workout_id: string;
  workout_name: string;
  workout_index: number;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  updated_at: string;
}

interface SetRow {
  id: string;
  session_id: string;
  user_id: string;
  exercise_slug: string;
  set_order: number;
  kind: 'warmup' | 'hard';
  target_reps: number;
  target_weight: number | null;
  reps: number | null;
  weight: number | null;
  unit: 'kg' | 'lb';
  completed: boolean;
  completed_at: string | null;
}

function toSessionRow(userId: string, s: Session): SessionRow {
  return {
    id: s.id,
    user_id: userId,
    block: s.block,
    phase: s.phase,
    week: s.week,
    is_deload: s.isDeload,
    workout_id: s.workoutId,
    workout_name: s.workoutName,
    workout_index: s.workoutIndex,
    started_at: s.startedAt,
    completed_at: s.completedAt,
    notes: s.notes,
    updated_at: s.updatedAt,
  };
}

function toSetRows(userId: string, s: Session): SetRow[] {
  return s.sets.map((set) => ({
    id: set.id,
    session_id: s.id,
    user_id: userId,
    exercise_slug: set.exerciseSlug,
    set_order: set.order,
    kind: set.kind,
    target_reps: set.targetReps,
    target_weight: set.targetWeight,
    reps: set.reps,
    weight: set.weight,
    unit: set.unit,
    completed: set.completed,
    completed_at: set.completedAt,
  }));
}

function fromRows(session: SessionRow, sets: SetRow[]): Session {
  return {
    id: session.id,
    block: session.block,
    phase: session.phase,
    week: session.week,
    isDeload: session.is_deload,
    workoutId: session.workout_id,
    workoutName: session.workout_name,
    workoutIndex: session.workout_index,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    notes: session.notes ?? '',
    updatedAt: session.updated_at,
    sets: sets
      .filter((r) => r.session_id === session.id)
      .sort((a, b) => a.set_order - b.set_order)
      .map(
        (r): SetLog => ({
          id: r.id,
          exerciseSlug: r.exercise_slug,
          order: r.set_order,
          kind: r.kind,
          targetReps: r.target_reps,
          targetWeight: r.target_weight,
          reps: r.reps,
          weight: r.weight,
          unit: r.unit,
          completed: r.completed,
          completedAt: r.completed_at,
        }),
      ),
  };
}

export async function pullAll(client: SupabaseClient, userId: string): Promise<AppData> {
  const [profile, sessions, sets, states] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).maybeSingle(),
    client
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(500),
    client.from('set_logs').select('*').eq('user_id', userId).limit(20000),
    client.from('exercise_states').select('*').eq('user_id', userId),
  ]);

  const sessionRows = (sessions.data ?? []) as SessionRow[];
  const setRows = (sets.data ?? []) as SetRow[];

  const exerciseStates: Record<string, ExerciseState> = {};
  for (const row of (states.data ?? []) as Array<Record<string, unknown>>) {
    const slug = row.exercise_slug as string;
    exerciseStates[slug] = {
      slug,
      lastWeight: (row.last_weight as number | null) ?? null,
      lastReps: (row.last_reps as number | null) ?? null,
      unit: (row.unit as 'kg' | 'lb') ?? 'kg',
      bestE1rm: (row.best_e1rm as number | null) ?? null,
      updatedAt: (row.updated_at as string) ?? new Date(0).toISOString(),
    };
  }

  const p = profile.data as Record<string, unknown> | null;

  // The sign-up trigger creates the profile row with `updated_at = now()` and
  // an empty settings blob. That timestamp would otherwise look newer than a
  // device that has been tracking for weeks, and the merge would hand it a
  // reset program position. An empty settings blob means the app has never
  // written this row, so it is dated to the epoch and always loses.
  const profileWritten =
    p != null && Object.keys((p.settings as Record<string, unknown>) ?? {}).length > 0;

  const progress: Progress = p
    ? {
        block: (p.block as number) ?? DEFAULT_PROGRESS.block,
        phase: (p.phase as number) ?? DEFAULT_PROGRESS.phase,
        week: (p.week as number) ?? DEFAULT_PROGRESS.week,
        updatedAt: profileWritten
          ? ((p.updated_at as string) ?? DEFAULT_PROGRESS.updatedAt)
          : DEFAULT_PROGRESS.updatedAt,
      }
    : { ...DEFAULT_PROGRESS };

  const settings: Settings = p?.settings
    ? { ...DEFAULT_SETTINGS, ...(p.settings as Partial<Settings>) }
    : { ...DEFAULT_SETTINGS };

  return {
    progress,
    settings,
    exerciseStates,
    sessions: sessionRows.map((row) => fromRows(row, setRows)),
  };
}

export async function pushSession(
  client: SupabaseClient,
  userId: string,
  session: Session,
): Promise<void> {
  const { error } = await client.from('sessions').upsert(toSessionRow(userId, session));
  if (error) throw error;

  const rows = toSetRows(userId, session);
  const keep = rows.map((r) => r.id);

  // Drop rows for sets that no longer exist (e.g. a set the user removed).
  let del = client.from('set_logs').delete().eq('session_id', session.id).eq('user_id', userId);
  if (keep.length > 0) del = del.not('id', 'in', `(${keep.join(',')})`);
  await del;

  if (rows.length > 0) {
    const { error: setError } = await client.from('set_logs').upsert(rows);
    if (setError) throw setError;
  }
}

export async function deleteSession(
  client: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<void> {
  await client.from('set_logs').delete().eq('session_id', sessionId).eq('user_id', userId);
  const { error } = await client.from('sessions').delete().eq('id', sessionId).eq('user_id', userId);
  if (error) throw error;
}

export async function pushProfile(
  client: SupabaseClient,
  userId: string,
  progress: Progress,
  settings: Settings,
): Promise<void> {
  const { error } = await client.from('profiles').upsert({
    id: userId,
    block: progress.block,
    phase: progress.phase,
    week: progress.week,
    settings,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function pushExerciseStates(
  client: SupabaseClient,
  userId: string,
  states: ExerciseState[],
): Promise<void> {
  if (states.length === 0) return;
  const { error } = await client.from('exercise_states').upsert(
    states.map((s) => ({
      user_id: userId,
      exercise_slug: s.slug,
      last_weight: s.lastWeight,
      last_reps: s.lastReps,
      unit: s.unit,
      best_e1rm: s.bestE1rm,
      updated_at: s.updatedAt,
    })),
  );
  if (error) throw error;
}
