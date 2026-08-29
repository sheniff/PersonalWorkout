import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronRight } from '../components/Icons';
import { periodLabel } from '../data/program';
import type { Session } from '../data/types';
import { formatMonth, formatShortDuration } from '../lib/format';
import {
  completedHardSets,
  sessionDurationSeconds,
  sessionVolume,
} from '../lib/progression';
import { formatWeightNumber } from '../lib/units';
import { useStore } from '../state/StoreContext';

export function History() {
  const navigate = useNavigate();
  const {
    data: { sessions, settings },
  } = useStore();

  const completed = useMemo(
    () =>
      sessions
        .filter((s) => s.completedAt)
        .sort(
          (a, b) =>
            new Date(b.completedAt ?? b.startedAt).getTime() -
            new Date(a.completedAt ?? a.startedAt).getTime(),
        ),
    [sessions],
  );

  const months = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const session of completed) {
      const key = formatMonth(session.completedAt ?? session.startedAt);
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [completed]);

  if (completed.length === 0) {
    return (
      <div className="screen">
        <header className="screen-head">
          <h1 className="screen-title">History</h1>
        </header>
        <div className="empty">
          <div className="empty-icon">📓</div>
          <p>No workouts logged yet.</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            Finish a session and it will show up here with every set you did.
          </p>
        </div>
      </div>
    );
  }

  const thisMonthVolume = completed
    .filter((s) => {
      const d = new Date(s.completedAt ?? s.startedAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((total, s) => total + sessionVolume(s), 0);

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">History</h1>
          <p className="screen-sub">{completed.length} workouts logged</p>
        </div>
      </header>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-value num">{completed.length}</div>
          <div className="stat-label">Workouts</div>
        </div>
        <div className="stat">
          <div className="stat-value num">
            {completed.reduce((n, s) => n + completedHardSets(s), 0)}
          </div>
          <div className="stat-label">Hard sets</div>
        </div>
        <div className="stat">
          <div className="stat-value num">
            {Math.round(thisMonthVolume).toLocaleString()}
          </div>
          <div className="stat-label">{settings.unit} this month</div>
        </div>
      </div>

      {months.map(([month, list]) => (
        <div key={month}>
          <h3 className="section-title">{month}</h3>
          <div className="stack">
            {list.map((session) => {
              const date = new Date(session.completedAt ?? session.startedAt);
              const duration = sessionDurationSeconds(session);
              return (
                <button
                  key={session.id}
                  type="button"
                  className="history-row"
                  onClick={() => navigate(`/history/${session.id}`)}
                >
                  <span className="history-date">
                    <span className="history-day num">{date.getDate()}</span>
                    <span className="history-month">
                      {date.toLocaleDateString(undefined, { weekday: 'short' })}
                    </span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="workout-name" style={{ display: 'block' }}>
                      {session.workoutName}
                      {session.isDeload ? ' · deload' : ''}
                    </span>
                    <span className="workout-sub" style={{ display: 'block' }}>
                      {periodLabel(session.phase, session.week)} · {completedHardSets(session)}{' '}
                      sets
                      {duration > 60 ? ` · ${formatShortDuration(duration)}` : ''}
                      {sessionVolume(session) > 0
                        ? ` · ${formatWeightNumber(Math.round(sessionVolume(session)))} ${settings.unit}`
                        : ''}
                    </span>
                  </span>
                  <IconChevronRight />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
