import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconClose } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import { getExercise } from '../data/exercises';
import { getWorkout, periodLabel } from '../data/program';
import { formatDateTime, formatShortDuration } from '../lib/format';
import {
  createSession,
  groupSets,
  sessionDurationSeconds,
  sessionVolume,
} from '../lib/progression';
import { formatWeight, isTimed, usesWeight } from '../lib/units';
import { useStore } from '../state/StoreContext';

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data: { sessions, settings, progress, exerciseStates },
    removeSession,
    upsertSession,
    setActiveSession,
  } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const session = sessions.find((s) => s.id === id);

  const repeat = () => {
    if (!session) return;
    const workout = getWorkout(session.phase, session.week, session.workoutIndex);
    if (!workout) return;
    const fresh = createSession(progress, workout, exerciseStates, settings);
    upsertSession(fresh);
    setActiveSession(fresh.id);
    navigate(`/session/${fresh.id}`);
  };

  const groups = useMemo(() => (session ? groupSets(session) : []), [session]);

  if (!session) {
    return (
      <div className="screen">
        <div className="empty">
          <div className="empty-icon">🤔</div>
          <p>Workout not found.</p>
        </div>
      </div>
    );
  }

  const duration = sessionDurationSeconds(session);
  const volume = sessionVolume(session);

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title" style={{ fontSize: 26 }}>
            {session.workoutName}
          </h1>
          <p className="screen-sub">
            {formatDateTime(session.completedAt ?? session.startedAt)} ·{' '}
            {periodLabel(session.phase, session.week)}
          </p>
        </div>
        <button
          type="button"
          className="btn btn--icon btn--ghost"
          onClick={() => navigate('/history')}
          aria-label="Close"
        >
          <IconClose />
        </button>
      </header>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-value num">
            {session.sets.filter((s) => s.kind === 'hard' && s.completed).length}
          </div>
          <div className="stat-label">Hard sets</div>
        </div>
        <div className="stat">
          <div className="stat-value num">
            {duration > 0 ? formatShortDuration(duration) : '—'}
          </div>
          <div className="stat-label">Duration</div>
        </div>
        <div className="stat">
          <div className="stat-value num">{Math.round(volume).toLocaleString()}</div>
          <div className="stat-label">{settings.unit} volume</div>
        </div>
      </div>

      {session.notes ? (
        <>
          <h3 className="section-title">Notes</h3>
          <div className="card" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {session.notes}
          </div>
        </>
      ) : null}

      <h3 className="section-title">Sets</h3>
      <div className="stack" style={{ gap: 10 }}>
        {groups.map((group, i) => {
          const exercise = getExercise(group.slug);
          const timed = isTimed(exercise.load);
          // Hard sets are numbered on their own; warm-ups don't consume a number.
          let hardCount = 0;
          const rows = group.entries.map(({ set }) => ({
            set,
            label: set.kind === 'warmup' ? 'Warm-up' : `Set ${(hardCount += 1)}`,
          }));
          return (
            <div key={`${group.slug}-${i}`} className="card card--tight">
              <div className="row-between" style={{ marginBottom: 8 }}>
                <div className="exercise-title">{exercise.name}</div>
              </div>
              <div className="stack" style={{ gap: 6 }}>
                {rows.map(({ set, label }, index) => (
                  <div
                    key={set.id}
                    className="row-between"
                    style={{
                      fontSize: 14,
                      padding: '6px 0',
                      borderTop: index === 0 ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    <span
                      className="chip"
                      style={{ minWidth: 52, justifyContent: 'center' }}
                    >
                      {label}
                    </span>
                    <span className="num" style={{ fontWeight: 620 }}>
                      {usesWeight(exercise.load) && set.weight != null
                        ? `${formatWeight(set.weight, set.unit)} × `
                        : ''}
                      {set.reps ?? '—'}
                      {timed ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="stack" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn--ghost btn--block" onClick={repeat}>
          Do this workout again
        </button>
        <button
          type="button"
          className="btn btn--danger btn--block"
          onClick={() => setConfirmDelete(true)}
        >
          Delete workout
        </button>
      </div>

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this workout?"
      >
        <p className="sheet-text">
          This removes the session and every set in it. Your last-used weights are not recalculated.
        </p>
        <div className="stack">
          <button
            type="button"
            className="btn btn--danger btn--block"
            onClick={() => {
              removeSession(session.id);
              navigate('/history', { replace: true });
            }}
          >
            Delete
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </button>
        </div>
      </Sheet>
    </div>
  );
}
