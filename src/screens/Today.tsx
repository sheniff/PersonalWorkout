import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronRight, IconCheck, IconFlame } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import { getExercise } from '../data/exercises';
import {
  DELOAD_WEEK,
  TOTAL_PHASES,
  getWorkoutsFor,
  isDeloadWeek,
  periodLabel,
} from '../data/program';
import type { Workout } from '../data/types';
import { relativeDay } from '../lib/format';
import {
  advanceProgress,
  completedWorkoutIndexes,
  createSession,
  isWeekComplete,
  nextWorkout,
} from '../lib/progression';
import { useStore } from '../state/StoreContext';

export function Today() {
  const navigate = useNavigate();
  const {
    data: { progress, sessions, settings, exerciseStates },
    activeSessionId,
    upsertSession,
    removeSession,
    setActiveSession,
    setProgress,
    syncStatus,
  } = useStore();

  const [confirmAdvance, setConfirmAdvance] = useState(false);

  const deload = isDeloadWeek(progress.week);
  const workouts = getWorkoutsFor(progress.phase, progress.week);
  const done = completedWorkoutIndexes(sessions, progress);
  const suggested = nextWorkout(sessions, progress);
  const weekDone = isWeekComplete(sessions, progress);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId && !s.completedAt),
    [sessions, activeSessionId],
  );

  const lastSession = useMemo(
    () => sessions.find((s) => s.completedAt),
    [sessions],
  );

  const start = (workout: Workout) => {
    const forThisSlot = (s: (typeof sessions)[number]) =>
      s.block === progress.block &&
      s.phase === progress.phase &&
      s.week === progress.week &&
      s.workoutIndex === workout.index;

    // Already done this week: show what was logged rather than opening a second
    // session for it. Minting one and backing out is what used to leave an
    // empty session behind, which the next tap then resumed with a days-old
    // timer running.
    const done = sessions.find((s) => s.completedAt && forThisSlot(s));
    if (done) {
      navigate(`/history/${done.id}`);
      return;
    }

    const existing = sessions.find((s) => !s.completedAt && forThisSlot(s));

    // Resume a workout genuinely in progress. One with nothing logged that was
    // started on an earlier day is abandoned, not paused: drop it so the timer
    // and the suggestions both start from today.
    if (existing) {
      const startedToday =
        new Date(existing.startedAt).toDateString() === new Date().toDateString();
      if (startedToday || existing.sets.some((s) => s.completed)) {
        setActiveSession(existing.id);
        navigate(`/session/${existing.id}`);
        return;
      }
      removeSession(existing.id);
    }

    const session = createSession(progress, workout, exerciseStates, settings);
    upsertSession(session);
    setActiveSession(session.id);
    navigate(`/session/${session.id}`);
  };

  const advance = () => {
    setProgress(advanceProgress(progress));
    setConfirmAdvance(false);
  };

  const nextPeriod = advanceProgress(progress);

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Today</h1>
          <p className="screen-sub">
            {periodLabel(progress.phase, progress.week)}
            {progress.block > 1 ? ` · Round ${progress.block}` : ''}
          </p>
        </div>
        <SyncPill status={syncStatus} />
      </header>

      {activeSession ? (
        <button
          type="button"
          className="banner banner--accent"
          style={{ width: '100%', textAlign: 'left', marginBottom: 14 }}
          onClick={() => navigate(`/session/${activeSession.id}`)}
        >
          <IconFlame />
          <div style={{ flex: 1 }}>
            <strong>Workout in progress</strong>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {activeSession.workoutName} · started {relativeDay(activeSession.startedAt)}
            </div>
          </div>
          <IconChevronRight />
        </button>
      ) : null}

      {suggested ? (
        <section className={deload ? 'hero hero--deload' : 'hero'}>
          <div className="hero-eyebrow">
            {deload ? 'Deload week' : `Workout ${suggested.index} of ${workouts.length}`}
          </div>
          <h2 className="hero-title">{suggested.name}</h2>
          <p className="hero-meta">
            {suggested.slots.length} exercises ·{' '}
            {deload
              ? '2 sets of 3 reps at your last hard-set weight'
              : `${suggested.slots.reduce((n, s) => n + s.sets, 0)} hard sets`}
          </p>

          <ul className="hero-list">
            {suggested.slots.map((slot) => {
              const exercise = getExercise(slot.slug);
              const state = exerciseStates[slot.slug];
              return (
                <li key={slot.slug}>
                  <strong>{exercise.name}</strong>
                  <span className="num">
                    {state?.lastWeight != null
                      ? `${state.lastWeight} ${state.unit}`
                      : `${exercise.repRange[0]}–${exercise.repRange[1]} reps`}
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className={`btn btn--block ${deload ? 'btn--deload' : 'btn--primary'}`}
            onClick={() => start(suggested)}
          >
            Start workout
          </button>

          <div className="week-strip">
            {workouts.map((w) => (
              <div
                key={w.id}
                className={[
                  'week-pip',
                  deload ? 'week-pip--deload' : '',
                  done.has(w.index) ? 'week-pip--done' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}
          </div>
        </section>
      ) : null}

      {weekDone ? (
        <div className="banner banner--accent" style={{ marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <strong>{deload ? 'Deload done.' : 'Week complete.'}</strong>{' '}
            Next up: {periodLabel(nextPeriod.phase, nextPeriod.week)}.
          </div>
          <button type="button" className="btn btn--sm btn--primary" onClick={advance}>
            Advance
          </button>
        </div>
      ) : null}

      <h3 className="section-title">
        {deload ? 'Deload week' : `Week ${progress.week} of ${DELOAD_WEEK - 1}`}
      </h3>
      <div className="stack">
        {workouts.map((w) => {
          const isDone = done.has(w.index);
          const isNext = suggested?.index === w.index && !isDone;
          return (
            <button
              key={w.id}
              type="button"
              className={[
                'workout-row',
                isDone ? 'workout-row--done' : '',
                isNext ? 'workout-row--next' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => start(w)}
            >
              <span className="workout-index">
                {isDone ? <IconCheck /> : w.index}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="workout-name">{w.name}</span>
                <span className="workout-sub" style={{ display: 'block' }}>
                  {w.slots.map((s) => getExercise(s.slug).name.split(' (')[0]).join(' · ')}
                </span>
              </span>
              <IconChevronRight />
            </button>
          );
        })}
      </div>

      <h3 className="section-title">Program</h3>
      <div className="card">
        <div className="row-between">
          <div>
            <div className="setting-label">
              Phase {progress.phase} of {TOTAL_PHASES}
            </div>
            <div className="setting-help">
              4 training weeks then a deload week, then the next phase.
            </div>
          </div>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => setConfirmAdvance(true)}
          >
            Jump ahead
          </button>
        </div>
        {lastSession ? (
          <div className="setting-help" style={{ marginTop: 12 }}>
            Last workout: {lastSession.workoutName} ·{' '}
            {relativeDay(lastSession.completedAt ?? lastSession.startedAt)}
          </div>
        ) : null}
      </div>

      <Sheet
        open={confirmAdvance}
        onClose={() => setConfirmAdvance(false)}
        title="Move to the next week?"
      >
        <p className="sheet-text">
          You are on {periodLabel(progress.phase, progress.week)}. Advancing takes you to{' '}
          {periodLabel(nextPeriod.phase, nextPeriod.week)}. Anything you have already logged stays
          in your history.
        </p>
        <div className="stack">
          <button type="button" className="btn btn--primary btn--block" onClick={advance}>
            Advance to {periodLabel(nextPeriod.phase, nextPeriod.week)}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => setConfirmAdvance(false)}
          >
            Cancel
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function SyncPill({ status }: { status: string }) {
  const label: Record<string, string> = {
    off: 'On device',
    'signed-out': 'Not synced',
    syncing: 'Syncing',
    synced: 'Synced',
    offline: 'Offline',
    error: 'Sync error',
  };
  const dot =
    status === 'synced'
      ? 'sync-dot sync-dot--synced'
      : status === 'syncing'
        ? 'sync-dot sync-dot--syncing'
        : status === 'error'
          ? 'sync-dot sync-dot--error'
          : 'sync-dot';

  return (
    <span className="chip" style={{ marginTop: 6 }}>
      <span className={dot} />
      {label[status] ?? status}
    </span>
  );
}
