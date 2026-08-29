import { useMemo, useState } from 'react';
import { Sparkline } from '../components/Sparkline';
import { MUSCLE_LABELS, getExercise } from '../data/exercises';
import type { MuscleGroup, Session } from '../data/types';
import { relativeDay } from '../lib/format';
import { convertWeight, estimate1rm, formatWeight, isTimed, usesWeight } from '../lib/units';
import { useStore } from '../state/StoreContext';

interface ExerciseSummary {
  slug: string;
  name: string;
  muscle: MuscleGroup;
  lastAt: string;
  lastWeight: number | null;
  lastReps: number | null;
  bestWeight: number | null;
  bestReps: number | null;
  trend: number[];
  sessionCount: number;
}

function summarise(sessions: Session[], unit: 'kg' | 'lb'): ExerciseSummary[] {
  const byExercise = new Map<string, ExerciseSummary>();

  const chronological = [...sessions]
    .filter((s) => s.completedAt)
    .sort(
      (a, b) =>
        new Date(a.completedAt ?? a.startedAt).getTime() -
        new Date(b.completedAt ?? b.startedAt).getTime(),
    );

  for (const session of chronological) {
    // One data point per exercise per session: the best set of that session.
    const bestOfSession = new Map<string, { weight: number | null; reps: number; score: number }>();

    for (const set of session.sets) {
      if (!set.completed || set.kind !== 'hard' || set.reps == null) continue;
      const weight = set.weight == null ? null : convertWeight(set.weight, set.unit, unit);
      const score = weight == null ? set.reps : estimate1rm(weight, set.reps);
      const current = bestOfSession.get(set.exerciseSlug);
      if (!current || score > current.score) {
        bestOfSession.set(set.exerciseSlug, { weight, reps: set.reps, score });
      }
    }

    for (const [slug, best] of bestOfSession) {
      const exercise = getExercise(slug);
      const existing = byExercise.get(slug);
      const at = session.completedAt ?? session.startedAt;

      if (!existing) {
        byExercise.set(slug, {
          slug,
          name: exercise.name,
          muscle: exercise.muscle,
          lastAt: at,
          lastWeight: best.weight,
          lastReps: best.reps,
          bestWeight: best.weight,
          bestReps: best.reps,
          trend: [best.score],
          sessionCount: 1,
        });
        continue;
      }

      const bestScore =
        existing.bestWeight == null
          ? (existing.bestReps ?? 0)
          : estimate1rm(existing.bestWeight, existing.bestReps ?? 0);

      byExercise.set(slug, {
        ...existing,
        lastAt: at,
        lastWeight: best.weight,
        lastReps: best.reps,
        bestWeight: best.score > bestScore ? best.weight : existing.bestWeight,
        bestReps: best.score > bestScore ? best.reps : existing.bestReps,
        trend: [...existing.trend, best.score].slice(-14),
        sessionCount: existing.sessionCount + 1,
      });
    }
  }

  return [...byExercise.values()].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );
}

export function Progress() {
  const {
    data: { sessions, settings },
  } = useStore();
  const [filter, setFilter] = useState<MuscleGroup | 'all'>('all');

  const summaries = useMemo(() => summarise(sessions, settings.unit), [sessions, settings.unit]);
  const visible = filter === 'all' ? summaries : summaries.filter((s) => s.muscle === filter);

  const muscles = useMemo(() => {
    const set = new Set<MuscleGroup>();
    for (const s of summaries) set.add(s.muscle);
    return [...set];
  }, [summaries]);

  const totalVolume = useMemo(
    () =>
      sessions.reduce((total, session) => {
        for (const set of session.sets) {
          if (!set.completed || set.kind !== 'hard') continue;
          if (set.weight == null || set.reps == null) continue;
          total += convertWeight(set.weight, set.unit, settings.unit) * set.reps;
        }
        return total;
      }, 0),
    [sessions, settings.unit],
  );

  if (summaries.length === 0) {
    return (
      <div className="screen">
        <header className="screen-head">
          <h1 className="screen-title">Progress</h1>
        </header>
        <div className="empty">
          <div className="empty-icon">📈</div>
          <p>Nothing to chart yet.</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            Log a few workouts and your lifts will start trending here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Progress</h1>
          <p className="screen-sub">{summaries.length} exercises tracked</p>
        </div>
      </header>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-value num">{sessions.filter((s) => s.completedAt).length}</div>
          <div className="stat-label">Workouts</div>
        </div>
        <div className="stat">
          <div className="stat-value num">
            {(Math.round(totalVolume / 100) / 10).toLocaleString()}k
          </div>
          <div className="stat-label">{settings.unit} lifted</div>
        </div>
        <div className="stat">
          <div className="stat-value num">
            {summaries.reduce((n, s) => n + s.sessionCount, 0)}
          </div>
          <div className="stat-label">Exercise logs</div>
        </div>
      </div>

      <div
        className="row"
        style={{ marginTop: 18, overflowX: 'auto', paddingBottom: 4, gap: 7 }}
      >
        <button
          type="button"
          className={filter === 'all' ? 'chip chip--accent' : 'chip'}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {muscles.map((m) => (
          <button
            key={m}
            type="button"
            className={filter === m ? 'chip chip--accent' : 'chip'}
            onClick={() => setFilter(m)}
          >
            {MUSCLE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="stack" style={{ marginTop: 12 }}>
        {visible.map((summary) => {
          const exercise = getExercise(summary.slug);
          const timed = isTimed(exercise.load);
          const showWeight = usesWeight(exercise.load) && summary.lastWeight != null;
          const improving =
            summary.trend.length > 1 &&
            summary.trend[summary.trend.length - 1] > summary.trend[0];

          return (
            <div key={summary.slug} className="exercise-stat-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="workout-name">{summary.name}</div>
                <div className="workout-sub num">
                  {showWeight
                    ? `${formatWeight(summary.lastWeight, settings.unit)} × ${summary.lastReps}`
                    : `${summary.lastReps}${timed ? 's' : ' reps'}`}
                  {' · '}
                  {relativeDay(summary.lastAt)}
                </div>
                {summary.bestWeight != null && showWeight ? (
                  <div className="workout-sub">
                    Best: {formatWeight(summary.bestWeight, settings.unit)} × {summary.bestReps}
                  </div>
                ) : null}
              </div>
              <Sparkline
                points={summary.trend}
                color={improving ? 'var(--success)' : 'var(--accent-hi)'}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
