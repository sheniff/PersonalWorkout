import { useEffect, useRef, useState } from 'react';

interface StepperProps {
  value: number | null;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  unit?: string;
  /** Renders flat, for completed sets. */
  quiet?: boolean;
  /** Shown when there is no value yet — e.g. a lift with no history. */
  placeholder?: string;
  ariaLabel: string;
}

function clean(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/**
 * Big thumb-sized −/+ control. The middle is a real number input, so a value
 * that is far from the current one can be typed instead of tapped 20 times.
 */
export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = 9999,
  unit,
  quiet,
  placeholder,
  ariaLabel,
}: StepperProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (draft === null) return;
    // Value changed underneath us (e.g. progression bumped it) — drop the draft.
    if (document.activeElement !== inputRef.current) setDraft(null);
  }, [value, draft]);

  const current = value ?? 0;
  const shown = draft ?? (value == null ? '' : clean(current));

  const commit = (raw: string) => {
    const parsed = Number.parseFloat(raw.replace(',', '.'));
    setDraft(null);
    if (Number.isNaN(parsed)) return;
    onChange(Math.min(max, Math.max(min, Math.round(parsed * 100) / 100)));
  };

  const bump = (direction: 1 | -1) => {
    const next = Math.min(max, Math.max(min, current + direction * step));
    onChange(Math.round(next * 100) / 100);
    if (navigator.vibrate) navigator.vibrate(6);
  };

  return (
    <div className={quiet ? 'stepper stepper--done' : 'stepper'}>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => bump(-1)}
        disabled={current <= min}
        aria-label={`Decrease ${ariaLabel}`}
      >
        −
      </button>
      <label className={unit ? 'stepper-field stepper-field--unit' : 'stepper-field'}>
        <span style={{ position: 'absolute', left: -9999 }}>{ariaLabel}</span>
        <input
          ref={inputRef}
          className="stepper-value num"
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={shown}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => {
            setDraft(e.target.value);
            e.target.select();
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
        {unit ? <span className="stepper-unit">{unit}</span> : null}
      </label>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => bump(1)}
        disabled={current >= max}
        aria-label={`Increase ${ariaLabel}`}
      >
        +
      </button>
    </div>
  );
}
