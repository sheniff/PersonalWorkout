import { useCallback, useEffect, useRef, useState } from 'react';

interface RestTimer {
  /** Seconds remaining. Goes negative once the rest target is passed. */
  remaining: number;
  target: number;
  running: boolean;
  start: (seconds: number) => void;
  stop: () => void;
  add: (seconds: number) => void;
}

/**
 * Wall-clock based so it stays accurate when the phone locks the screen or the
 * tab is backgrounded — an interval counter would drift badly there.
 */
export function useRestTimer(onElapsed?: () => void): RestTimer {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [target, setTarget] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (endsAt == null) return;
    const tick = () => {
      const left = (endsAt - Date.now()) / 1000;
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        onElapsed?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [endsAt, onElapsed]);

  const start = useCallback((seconds: number) => {
    firedRef.current = false;
    setTarget(seconds);
    setEndsAt(Date.now() + seconds * 1000);
  }, []);

  const stop = useCallback(() => {
    setEndsAt(null);
    setRemaining(0);
    setTarget(0);
  }, []);

  const add = useCallback((seconds: number) => {
    setEndsAt((current) => (current == null ? null : current + seconds * 1000));
    setTarget((t) => t + seconds);
  }, []);

  return { remaining, target, running: endsAt != null, start, stop, add };
}

/** Keeps the phone screen on while a workout is in progress. */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if (!('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // Denied (low battery, unsupported) — not worth surfacing.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !released) void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, [enabled]);
}

/** Elapsed seconds since an ISO timestamp, ticking once a second. */
export function useElapsed(sinceIso: string | null): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sinceIso) return;
    const start = new Date(sinceIso).getTime();
    const tick = () => setElapsed((Date.now() - start) / 1000);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [sinceIso]);

  return elapsed;
}
