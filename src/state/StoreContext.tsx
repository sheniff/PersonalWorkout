import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppData, ExerciseState, Progress, Session, Settings } from '../data/types';
import {
  emptyData,
  loadActiveSessionId,
  loadLocal,
  saveActiveSessionId,
  saveLocal,
} from '../lib/localStore';
import * as remote from '../lib/remote';
import { cloudEnabled, supabase } from '../lib/supabase';

export type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error';

interface User {
  id: string;
  email: string;
}

interface StoreValue {
  ready: boolean;
  data: AppData;
  user: User | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  activeSessionId: string | null;

  setSettings: (patch: Partial<Settings>) => void;
  setProgress: (patch: Partial<Progress>) => void;
  upsertSession: (session: Session) => void;
  removeSession: (sessionId: string) => void;
  setExerciseStates: (states: Record<string, ExerciseState>) => void;
  setActiveSession: (sessionId: string | null) => void;

  signIn: (email: string) => Promise<{ error?: string }>;
  verifyCode: (email: string, code: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  exportData: () => string;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function newer(a: string | undefined, b: string | undefined): boolean {
  return new Date(a ?? 0).getTime() > new Date(b ?? 0).getTime();
}

/** Last-write-wins merge, per record. Good enough for a single-user tracker. */
function mergeData(local: AppData, incoming: AppData): AppData {
  const sessions = new Map<string, Session>();
  for (const s of incoming.sessions) sessions.set(s.id, s);
  for (const s of local.sessions) {
    const existing = sessions.get(s.id);
    if (!existing || newer(s.updatedAt, existing.updatedAt)) sessions.set(s.id, s);
  }

  const exerciseStates: Record<string, ExerciseState> = { ...incoming.exerciseStates };
  for (const [slug, state] of Object.entries(local.exerciseStates)) {
    const existing = exerciseStates[slug];
    if (!existing || newer(state.updatedAt, existing.updatedAt)) exerciseStates[slug] = state;
  }

  const useLocalProfile = newer(local.progress.updatedAt, incoming.progress.updatedAt);

  return {
    progress: useLocalProfile ? local.progress : incoming.progress,
    settings: useLocalProfile ? local.settings : incoming.settings,
    exerciseStates,
    sessions: [...sessions.values()].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    ),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => emptyData());
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudEnabled ? 'signed-out' : 'off');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(null);

  // Sessions and exercise states that still need to reach the cloud.
  const dirtySessions = useRef<Set<string>>(new Set());
  const dirtyProfile = useRef(false);
  const dirtyStates = useRef<Set<string>>(new Set());
  const deletedSessions = useRef<Set<string>>(new Set());
  const dataRef = useRef<AppData>(data);
  const userRef = useRef<User | null>(null);

  dataRef.current = data;
  userRef.current = user;

  // --- boot: local first, always ------------------------------------------
  useEffect(() => {
    setData(loadLocal());
    setActiveSessionIdState(loadActiveSessionId());
    setReady(true);
  }, []);

  const persist = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
    saveLocal(next);
  }, []);

  // --- auth ----------------------------------------------------------------
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? '' } : null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? '' } : null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // --- sync ----------------------------------------------------------------
  const flush = useCallback(async () => {
    const client = supabase;
    const currentUser = userRef.current;
    if (!client || !currentUser) return;

    const current = dataRef.current;

    for (const id of [...deletedSessions.current]) {
      await remote.deleteSession(client, currentUser.id, id);
      deletedSessions.current.delete(id);
    }

    for (const id of [...dirtySessions.current]) {
      const session = current.sessions.find((s) => s.id === id);
      if (!session) {
        dirtySessions.current.delete(id);
        continue;
      }
      await remote.pushSession(client, currentUser.id, session);
      dirtySessions.current.delete(id);
    }

    if (dirtyStates.current.size > 0) {
      const states = [...dirtyStates.current]
        .map((slug) => current.exerciseStates[slug])
        .filter((s): s is ExerciseState => Boolean(s));
      await remote.pushExerciseStates(client, currentUser.id, states);
      dirtyStates.current.clear();
    }

    if (dirtyProfile.current) {
      await remote.pushProfile(client, currentUser.id, current.progress, current.settings);
      dirtyProfile.current = false;
    }
  }, []);

  const syncNow = useCallback(async () => {
    const client = supabase;
    const currentUser = userRef.current;
    if (!client || !currentUser) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const incoming = await remote.pullAll(client, currentUser.id);
      const merged = mergeData(dataRef.current, incoming);
      persist(merged);

      // Anything local that the server does not have (or has an older copy of)
      // goes up on this same pass.
      for (const session of merged.sessions) {
        const remoteCopy = incoming.sessions.find((s) => s.id === session.id);
        if (!remoteCopy || newer(session.updatedAt, remoteCopy.updatedAt)) {
          dirtySessions.current.add(session.id);
        }
      }
      for (const [slug, state] of Object.entries(merged.exerciseStates)) {
        const remoteCopy = incoming.exerciseStates[slug];
        if (!remoteCopy || newer(state.updatedAt, remoteCopy.updatedAt)) {
          dirtyStates.current.add(slug);
        }
      }
      if (newer(merged.progress.updatedAt, incoming.progress.updatedAt)) {
        dirtyProfile.current = true;
      }

      await flush();
      setSyncStatus('synced');
    } catch (err) {
      setSyncStatus('error');
      setSyncError(err instanceof Error ? err.message : String(err));
    }
  }, [flush, persist]);

  // Full sync on sign-in.
  useEffect(() => {
    if (!ready) return;
    if (!cloudEnabled) {
      setSyncStatus('off');
      return;
    }
    if (!user) {
      setSyncStatus('signed-out');
      return;
    }
    void syncNow();
  }, [ready, user, syncNow]);

  // Background flush of pending writes.
  useEffect(() => {
    if (!cloudEnabled || !user) return;
    const tick = () => {
      if (
        dirtySessions.current.size === 0 &&
        dirtyStates.current.size === 0 &&
        deletedSessions.current.size === 0 &&
        !dirtyProfile.current
      ) {
        return;
      }
      flush()
        .then(() => setSyncStatus('synced'))
        .catch((err) => {
          setSyncStatus('error');
          setSyncError(err instanceof Error ? err.message : String(err));
        });
    };

    const interval = window.setInterval(tick, 8000);
    window.addEventListener('online', tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', tick);
    };
  }, [flush, user]);

  // --- mutations -----------------------------------------------------------
  const setSettings = useCallback(
    (patch: Partial<Settings>) => {
      dirtyProfile.current = true;
      persist({
        ...dataRef.current,
        settings: { ...dataRef.current.settings, ...patch },
        progress: { ...dataRef.current.progress, updatedAt: new Date().toISOString() },
      });
    },
    [persist],
  );

  const setProgress = useCallback(
    (patch: Partial<Progress>) => {
      dirtyProfile.current = true;
      persist({
        ...dataRef.current,
        progress: {
          ...dataRef.current.progress,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      });
    },
    [persist],
  );

  const upsertSession = useCallback(
    (session: Session) => {
      const stamped = { ...session, updatedAt: new Date().toISOString() };
      dirtySessions.current.add(stamped.id);
      const existing = dataRef.current.sessions.findIndex((s) => s.id === stamped.id);
      const sessions =
        existing >= 0
          ? dataRef.current.sessions.map((s, i) => (i === existing ? stamped : s))
          : [stamped, ...dataRef.current.sessions];
      persist({ ...dataRef.current, sessions });
    },
    [persist],
  );

  const removeSession = useCallback(
    (sessionId: string) => {
      dirtySessions.current.delete(sessionId);
      deletedSessions.current.add(sessionId);
      persist({
        ...dataRef.current,
        sessions: dataRef.current.sessions.filter((s) => s.id !== sessionId),
      });
    },
    [persist],
  );

  const setExerciseStates = useCallback(
    (states: Record<string, ExerciseState>) => {
      for (const slug of Object.keys(states)) {
        const before = dataRef.current.exerciseStates[slug];
        if (!before || before.updatedAt !== states[slug].updatedAt) dirtyStates.current.add(slug);
      }
      persist({ ...dataRef.current, exerciseStates: states });
    },
    [persist],
  );

  const setActiveSession = useCallback((sessionId: string | null) => {
    setActiveSessionIdState(sessionId);
    saveActiveSessionId(sessionId);
  }, []);

  // --- auth actions --------------------------------------------------------
  const signIn = useCallback(async (email: string) => {
    if (!supabase) return { error: 'Cloud sync is not configured.' };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return error ? { error: error.message } : {};
  }, []);

  /**
   * Code entry, rather than following the emailed link.
   *
   * On iOS a home-screen PWA has its own storage container, and a link from
   * Mail always opens in the browser — so a magic link signs you into the
   * browser and leaves the installed app logged out, with no way to hand the
   * session across. Typing the code keeps the whole exchange inside whichever
   * container the user is actually in.
   */
  const verifyCode = useCallback(async (email: string, code: string) => {
    if (!supabase) return { error: 'Cloud sync is not configured.' };
    const token = code.replace(/\D/g, '');
    if (token.length < 6) return { error: 'Enter the 6-digit code from the email.' };

    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (!error) return {};

    // A first-ever sign-in on a new account is issued as a signup token.
    const retry = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    return retry.error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const exportData = useCallback(() => JSON.stringify(dataRef.current, null, 2), []);

  const resetAll = useCallback(() => {
    persist(emptyData());
    setActiveSession(null);
  }, [persist, setActiveSession]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      data,
      user,
      syncStatus,
      syncError,
      activeSessionId,
      setSettings,
      setProgress,
      upsertSession,
      removeSession,
      setExerciseStates,
      setActiveSession,
      signIn,
      verifyCode,
      signOut,
      syncNow,
      exportData,
      resetAll,
    }),
    [
      ready,
      data,
      user,
      syncStatus,
      syncError,
      activeSessionId,
      setSettings,
      setProgress,
      upsertSession,
      removeSession,
      setExerciseStates,
      setActiveSession,
      signIn,
      verifyCode,
      signOut,
      syncNow,
      exportData,
      resetAll,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
