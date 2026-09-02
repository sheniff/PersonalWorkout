import { useState } from 'react';
import { Sheet } from '../components/Sheet';
import { Stepper } from '../components/Stepper';
import { DELOAD_WEEK, TOTAL_PHASES, periodLabel } from '../data/program';
import type { Unit } from '../data/types';
import { isAbandoned } from '../lib/progression';
import { cloudEnabled } from '../lib/supabase';
import { useStore } from '../state/StoreContext';

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="switch"
      aria-pressed={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  );
}

export function Settings() {
  const {
    data: { settings, progress, sessions },
    activeSessionId,
    purgeAbandoned,
    setSettings,
    setProgress,
    user,
    syncStatus,
    syncError,
    signIn,
    verifyCode,
    signOut,
    syncNow,
    exportData,
    resetAll,
  } = useStore();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [purged, setPurged] = useState<number | null>(null);

  // The workout currently open is never a candidate, even before its first set.
  const abandoned = sessions.filter((s) => isAbandoned(s) && s.id !== activeSessionId);

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setAuthMessage(null);
    const { error } = await signIn(email.trim());
    setSending(false);
    setAuthError(Boolean(error));
    setAuthMessage(error ?? `We sent a 6-digit code to ${email.trim()}.`);
    if (!error) setCodeSent(true);
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setAuthMessage(null);
    const { error } = await verifyCode(email.trim(), code);
    setVerifying(false);
    setAuthError(Boolean(error));
    if (error) {
      setAuthMessage(error);
      return;
    }
    setCode('');
    setCodeSent(false);
    setAuthMessage(null);
  };

  return (
    <div className="screen">
      <header className="screen-head">
        <h1 className="screen-title">Settings</h1>
      </header>

      <h3 className="section-title">Units and steppers</h3>
      <div className="card">
        <div className="setting">
          <div>
            <div className="setting-label">Weight unit</div>
            <div className="setting-help">
              Existing logs keep the unit they were recorded in and are converted on the fly.
            </div>
          </div>
          <div className="segmented">
            {(['kg', 'lb'] as Unit[]).map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={settings.unit === u}
                onClick={() => setSettings({ unit: u })}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h3 className="section-title">Rest timer</h3>
      <div className="card">
        <div className="setting">
          <div>
            <div className="setting-label">Between hard sets</div>
            <div className="setting-help">The program calls for 3 minutes on heavy sets.</div>
          </div>
          <div style={{ width: 130 }}>
            <Stepper
              value={settings.restHard}
              onChange={(restHard) => setSettings({ restHard })}
              step={15}
              min={30}
              max={600}
              unit="s"
              ariaLabel="Rest between hard sets"
            />
          </div>
        </div>
        <div className="setting">
          <div>
            <div className="setting-label">Between warm-up sets</div>
            <div className="setting-help">Short and easy — around a minute.</div>
          </div>
          <div style={{ width: 130 }}>
            <Stepper
              value={settings.restWarmup}
              onChange={(restWarmup) => setSettings({ restWarmup })}
              step={15}
              min={0}
              max={300}
              unit="s"
              ariaLabel="Rest between warm-up sets"
            />
          </div>
        </div>
        <div className="setting">
          <div>
            <div className="setting-label">Start automatically</div>
            <div className="setting-help">The timer runs the moment you tick a set off.</div>
          </div>
          <Toggle
            checked={settings.autoStartRest}
            onChange={(autoStartRest) => setSettings({ autoStartRest })}
            label="Start rest timer automatically"
          />
        </div>
      </div>

      <h3 className="section-title">During a workout</h3>
      <div className="card">
        <div className="setting">
          <div>
            <div className="setting-label">Include warm-up sets</div>
            <div className="setting-help">
              The 50/50/70/90% ramp on the first exercise of each block.
            </div>
          </div>
          <Toggle
            checked={settings.showWarmups}
            onChange={(showWarmups) => setSettings({ showWarmups })}
            label="Include warm-up sets"
          />
        </div>
        <div className="setting">
          <div>
            <div className="setting-label">Keep the screen awake</div>
            <div className="setting-help">Stops your phone locking between sets.</div>
          </div>
          <Toggle
            checked={settings.keepScreenAwake}
            onChange={(keepScreenAwake) => setSettings({ keepScreenAwake })}
            label="Keep the screen awake"
          />
        </div>
      </div>

      <h3 className="section-title">Where you are in the program</h3>
      <div className="card">
        <div className="setting">
          <div>
            <div className="setting-label">{periodLabel(progress.phase, progress.week)}</div>
            <div className="setting-help">
              Round {progress.block} of the six-phase program. Change this only if the app has
              drifted from real life.
            </div>
          </div>
        </div>
        <div className="setting">
          <div className="setting-label">Phase</div>
          <div style={{ width: 130 }}>
            <Stepper
              value={progress.phase}
              onChange={(phase) => setProgress({ phase })}
              step={1}
              min={1}
              max={TOTAL_PHASES}
              ariaLabel="Phase"
            />
          </div>
        </div>
        <div className="setting">
          <div>
            <div className="setting-label">Week</div>
            <div className="setting-help">Week {DELOAD_WEEK} is the deload week.</div>
          </div>
          <div style={{ width: 130 }}>
            <Stepper
              value={progress.week}
              onChange={(week) => setProgress({ week })}
              step={1}
              min={1}
              max={DELOAD_WEEK}
              ariaLabel="Week"
            />
          </div>
        </div>
      </div>

      <h3 className="section-title">Sync</h3>
      <div className="card">
        {!cloudEnabled ? (
          <div className="setting">
            <div>
              <div className="setting-label">On this device only</div>
              <div className="setting-help">
                Add your Supabase URL and anon key to the environment to sync across devices.
                Everything works without it.
              </div>
            </div>
          </div>
        ) : user ? (
          <>
            <div className="setting">
              <div>
                <div className="setting-label">{user.email}</div>
                <div className="setting-help">
                  Status: {syncStatus}
                  {syncError ? ` — ${syncError}` : ''}
                </div>
              </div>
            </div>
            <div className="row" style={{ paddingTop: 12 }}>
              <button type="button" className="btn btn--sm" onClick={() => void syncNow()}>
                Sync now
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            </div>
          </>
        ) : codeSent ? (
          <form onSubmit={submitCode}>
            <div className="setting-label" style={{ marginBottom: 4 }}>
              Enter your code
            </div>
            <div className="setting-help" style={{ marginBottom: 12 }}>
              Typing the code signs you in right here. Tapping the link in the email would open
              your browser instead, which on iOS is a different app to this one.
            </div>
            <input
              className="input code-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ marginBottom: 10 }}
            />
            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={verifying || code.length < 6}
            >
              {verifying ? 'Signing in…' : 'Sign in'}
            </button>
            <div className="row" style={{ marginTop: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={submitEmail}
                disabled={sending}
              >
                {sending ? 'Sending…' : 'Resend code'}
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => {
                  setCodeSent(false);
                  setCode('');
                  setAuthMessage(null);
                  setAuthError(false);
                }}
              >
                Change email
              </button>
            </div>
            {authMessage ? (
              <p
                className="setting-help"
                style={{ marginTop: 10, color: authError ? 'var(--danger)' : undefined }}
              >
                {authMessage}
              </p>
            ) : null}
          </form>
        ) : (
          <form onSubmit={submitEmail}>
            <div className="setting-label" style={{ marginBottom: 4 }}>
              Sign in to sync
            </div>
            <div className="setting-help" style={{ marginBottom: 12 }}>
              We email you a 6-digit code — no password to remember. Your workouts stay on this
              device either way.
            </div>
            <input
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <button type="submit" className="btn btn--primary btn--block" disabled={sending}>
              {sending ? 'Sending…' : 'Email me a code'}
            </button>
            {authMessage ? (
              <p
                className="setting-help"
                style={{ marginTop: 10, color: authError ? 'var(--danger)' : undefined }}
              >
                {authMessage}
              </p>
            ) : null}
          </form>
        )}
      </div>

      <h3 className="section-title">Your data</h3>
      <div className="card">
        <div className="setting">
          <div>
            <div className="setting-label">Export</div>
            <div className="setting-help">
              {sessions.length} sessions as JSON, yours to keep.
            </div>
          </div>
          <button type="button" className="btn btn--sm btn--ghost" onClick={download}>
            Download
          </button>
        </div>
        {abandoned.length > 0 ? (
          <div className="setting">
            <div>
              <div className="setting-label">Abandoned workouts</div>
              <div className="setting-help">
                {abandoned.length} session{abandoned.length === 1 ? '' : 's'} opened but never
                logged. Nothing you finished is affected.
              </div>
            </div>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setConfirmPurge(true)}
            >
              Clean up
            </button>
          </div>
        ) : purged !== null ? (
          <div className="setting">
            <div>
              <div className="setting-label">Cleaned up</div>
              <div className="setting-help">
                Removed {purged} abandoned session{purged === 1 ? '' : 's'}.
              </div>
            </div>
          </div>
        ) : null}
        <div className="setting">
          <div>
            <div className="setting-label">Reset everything</div>
            <div className="setting-help">Clears this device. Synced data is not touched.</div>
          </div>
          <button
            type="button"
            className="btn btn--sm btn--danger"
            onClick={() => setConfirmReset(true)}
          >
            Reset
          </button>
        </div>
      </div>

      <p className="setting-help" style={{ marginTop: 22, textAlign: 'center' }}>
        Bigger Leaner Stronger 5-day routine · 6 phases × 4 weeks + deload
      </p>

      <Sheet
        open={confirmPurge}
        onClose={() => setConfirmPurge(false)}
        title={`Remove ${abandoned.length} abandoned workout${abandoned.length === 1 ? '' : 's'}?`}
      >
        <p className="sheet-text">
          These were opened but never logged a single set, so there is nothing in them to lose.
          They are deleted here and in the cloud. Finished workouts and anything in progress are
          untouched.
        </p>
        <div className="stack">
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => {
              setPurged(purgeAbandoned(activeSessionId));
              setConfirmPurge(false);
            }}
          >
            Remove them
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => setConfirmPurge(false)}
          >
            Cancel
          </button>
        </div>
      </Sheet>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset this device?">
        <p className="sheet-text">
          Every session, weight and program position stored on this device is erased. If you are
          signed in, a sync will pull your cloud data back.
        </p>
        <div className="stack">
          <button
            type="button"
            className="btn btn--danger btn--block"
            onClick={() => {
              resetAll();
              setConfirmReset(false);
            }}
          >
            Erase local data
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => setConfirmReset(false)}
          >
            Cancel
          </button>
        </div>
      </Sheet>
    </div>
  );
}
