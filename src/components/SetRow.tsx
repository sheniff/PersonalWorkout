import type { Exercise, SetLog, Unit } from '../data/types';
import { increment, isTimed, usesWeight } from '../lib/units';
import { IconCheck } from './Icons';
import { Stepper } from './Stepper';

interface SetRowProps {
  set: SetLog;
  exercise: Exercise;
  unit: Unit;
  label: string;
  active: boolean;
  /** Column headings are drawn once per exercise, not once per row. */
  showLabels: boolean;
  onChange: (patch: Partial<Pick<SetLog, 'reps' | 'weight'>>) => void;
  onToggle: () => void;
}

export function SetRow({
  set,
  exercise,
  unit,
  label,
  active,
  showLabels,
  onChange,
  onToggle,
}: SetRowProps) {
  const showWeight = usesWeight(exercise.load);
  const timed = isTimed(exercise.load);
  const step = increment(exercise.load, unit);

  const classes = ['set-row'];
  if (set.kind === 'warmup') classes.push('set-row--warmup');
  if (set.completed) classes.push('set-row--done');
  else if (active) classes.push('set-row--active');

  return (
    <div className={classes.join(' ')} id={active && !set.completed ? 'active-set' : undefined}>
      <div className="set-tag">{label}</div>

      <div className="set-fields">
        {showWeight ? (
          <div className="field">
            {showLabels ? (
              <div className="field-label">
                {exercise.load === 'bodyweight_plus' ? 'Added' : 'Weight'}
                {exercise.load === 'dumbbell' ? ' ea' : ''} · {unit}
              </div>
            ) : null}
            <Stepper
              value={set.weight}
              onChange={(weight) => onChange({ weight })}
              step={step}
              min={0}
              quiet={set.completed}
              placeholder="0"
              ariaLabel={`${exercise.name} set ${label} weight in ${unit}`}
            />
          </div>
        ) : null}

        <div className="field">
          {showLabels ? <div className="field-label">{timed ? 'Seconds' : 'Reps'}</div> : null}
          <Stepper
            value={set.reps}
            onChange={(reps) => onChange({ reps })}
            step={timed ? 5 : 1}
            min={0}
            max={timed ? 600 : 100}
            quiet={set.completed}
            ariaLabel={`${exercise.name} set ${label} ${timed ? 'seconds' : 'reps'}`}
          />
        </div>
      </div>

      <button
        type="button"
        className={set.completed ? 'set-check set-check--done' : 'set-check'}
        onClick={onToggle}
        aria-pressed={set.completed}
        aria-label={set.completed ? `Undo set ${label}` : `Log set ${label}`}
      >
        <IconCheck />
      </button>
    </div>
  );
}
