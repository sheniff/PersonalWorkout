import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconClose } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import { getExercise } from '../data/exercises';
import { periodLabel } from '../data/program';
import type { SetLog } from '../data/types';
import { formatDateTime, formatShortDuration } from '../lib/format';
import { sessionDurationSeconds, sessionVolume } from '../lib/progression';
import { formatWeight, isTimed, usesWeight } from '../lib/units';
import { useStore } from '../state/StoreContext';

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data: { sessions, settings },
    removeSession,
  } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const session = sessions.find((s) => s.id === id);

  const groups = useMemo(() => {
    const out: { slug: string; sets: SetLog[] }[] = [];
    session?.sets.forEach((set) => {
      const last = out[out.length - 1];
      if (last && last.slug === set.exerciseSlug) last.sets.push(set);
      else out.push({ slug: set.exerciseSlug, sets: [set] });
    });
    return out;
  }, [session]);

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
          return (
            <div key={`${group.slug}-${i}`} className="card card--tight">
              <div className="row-between" style={{ marginBottom: 8 }}>
                <div className="exercise-title">{exercise.name}</div>
              </div>
              <div className="stack" style={{ gap: 6 }}>
                {group.sets.map((set, index) => (
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
                      {set.kind === 'warmup' ? 'Warm-up' : `Set ${index + 1}`}
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

      <button
        type="button"
        className="btn btn--danger btn--block"
        style={{ marginTop: 20 }}
        onClick={() => setConfirmDelete(true)}
      >
        Delete workout
      </button>

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
