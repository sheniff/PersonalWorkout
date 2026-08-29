import { formatDuration } from '../lib/format';

interface RestBarProps {
  remaining: number;
  target: number;
  nextLabel: string | null;
  onSkip: () => void;
  onAdd: (seconds: number) => void;
}

export function RestBar({ remaining, target, nextLabel, onSkip, onAdd }: RestBarProps) {
  const over = remaining <= 0;
  const pct = target > 0 ? Math.max(0, Math.min(1, remaining / target)) : 0;

  return (
    <div className={over ? 'rest-bar rest-bar--overtime' : 'rest-bar'} role="status">
      <div>
        <div className="rest-label">{over ? 'Ready' : 'Rest'}</div>
        <div className="rest-time" style={{ color: over ? 'var(--success)' : undefined }}>
          {over ? `+${formatDuration(-remaining)}` : formatDuration(remaining)}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            height: 4,
            borderRadius: 999,
            background: 'var(--surface-2)',
            overflow: 'hidden',
            marginBottom: 6,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct * 100}%`,
              background: over ? 'var(--success)' : 'var(--accent)',
              transition: 'width 0.25s linear',
            }}
          />
        </div>
        {nextLabel ? <div className="rest-next">Next: {nextLabel}</div> : null}
      </div>

      <button type="button" className="btn btn--sm btn--ghost" onClick={() => onAdd(30)}>
        +30s
      </button>
      <button type="button" className="btn btn--sm" onClick={onSkip}>
        Skip
      </button>
    </div>
  );
}
