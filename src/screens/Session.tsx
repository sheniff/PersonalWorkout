import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconCheck, IconChevronDown, IconClose } from '../components/Icons';
import { RestBar } from '../components/RestBar';
import { SetRow } from '../components/SetRow';
import { Sheet } from '../components/Sheet';
import { getExercise } from '../data/exercises';
import type { SetLog } from '../data/types';
import { formatDuration, uid } from '../lib/format';
import {
  applyProgressionWithinSession,
  groupSets,
  propagateEdit,
  recomputeWarmups,
  updateExerciseStates,
} from '../lib/progression';
import { formatWeight, isTimed, usesWeight } from '../lib/units';
import { useStore } from '../state/StoreContext';
import { useElapsed, useRestTimer, useWakeLock } from '../state/useRestTimer';

export function Session() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data: { sessions, settings, exerciseStates },
    upsertSession,
    removeSession,
    setExerciseStates,
    setActiveSession,
  } = useStore();

  const session = sessions.find((s) => s.id === id);

  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [showWarmups, setShowWarmups] = useState<Record<string, boolean>>({});
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const elapsed = useElapsed(session?.startedAt ?? null);
  useWakeLock(settings.keepScreenAwake && !!session && !session.completedAt);

  const onRestElapsed = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([90, 60, 90]);
  }, []);
  const rest = useRestTimer(onRestElapsed);

  // Set after a set is ticked off, so the screen follows you down the list
  // instead of leaving the next set behind the rest timer.
  const scrollPending = useRef(false);

  useEffect(() => {
    if (session) setNotes(session.notes);
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => (session ? groupSets(session) : []), [session]);

  // "Next set" follows the order shown on screen, not the array order.
  const activeIndex = useMemo(() => {
    for (const group of groups) {
      for (const entry of group.entries) {
        if (!entry.set.completed) return entry.index;
      }
    }
    return -1;
  }, [groups]);
  const activeGroup = groups.find((g) => g.entries.some((e) => e.index === activeIndex));
  const expandedSlug = openSlug ?? activeGroup?.slug ?? groups[0]?.slug ?? null;

  // Finishing an exercise slides the next one open, so the screen keeps up with
  // where you actually are without any tapping.
  useEffect(() => {
    setOpenSlug(null);
  }, [activeGroup?.slug]);

  // A finished workout belongs in history, not the live session screen — there
  // the elapsed timer would count up from the day it was done.
  useEffect(() => {
    if (session?.completedAt) navigate(`/history/${session.id}`, { replace: true });
  }, [session?.completedAt, session?.id, navigate]);

  useEffect(() => {
    if (!scrollPending.current) return;
    scrollPending.current = false;
    const id = window.requestAnimationFrame(() => {
      document
        .getElementById('active-set')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeIndex]);

  if (!session) {
    return (
      <div className="screen">
        <div className="empty">
          <div className="empty-icon">🤔</div>
          <p>That workout is no longer here.</p>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/')}
          >
            Back to today
          </button>
        </div>
      </div>
    );
  }

  const totalHard = session.sets.filter((s) => s.kind === 'hard').length;
  const doneHard = session.sets.filter((s) => s.kind === 'hard' && s.completed).length;
  const allDone = session.sets.every((s) => s.completed);

  const updateSets = (sets: SetLog[]) => upsertSession({ ...session, sets });

  const editSet = (index: number, patch: Partial<Pick<SetLog, 'reps' | 'weight'>>) => {
    const target = session.sets[index];
    let sets = propagateEdit(session.sets, index, patch);

    // Setting the working weight also rebuilds the warm-up ramp underneath it.
    if (patch.weight !== undefined && target.kind === 'hard') {
      const firstHard = sets.findIndex(
        (s) => s.exerciseSlug === target.exerciseSlug && s.kind === 'hard',
      );
      if (firstHard === index) {
        sets = recomputeWarmups(sets, target.exerciseSlug, patch.weight ?? null, settings.unit);
      }
    }

    updateSets(sets);
  };

  const toggleSet = (index: number) => {
    const target = session.sets[index];
    const nowDone = !target.completed;

    let sets = session.sets.map((s, i) =>
      i === index
        ? { ...s, completed: nowDone, completedAt: nowDone ? new Date().toISOString() : null }
        : s,
    );

    if (nowDone) {
      scrollPending.current = true;
      sets = applyProgressionWithinSession(sets, index, settings.unit);
      if (settings.autoStartRest) {
        rest.start(target.kind === 'hard' ? settings.restHard : settings.restWarmup);
      }
      if (navigator.vibrate) navigator.vibrate(14);
    }

    updateSets(sets);
  };

  const addSet = (slug: string) => {
    const entries = groups.find((g) => g.slug === slug)?.entries ?? [];
    const template = [...entries].reverse().find((e) => e.set.kind === 'hard')?.set;
    if (!template) return;
    const insertAt = entries[entries.length - 1].index + 1;
    const extra: SetLog = {
      ...template,
      id: uid(),
      order: template.order + 1,
      completed: false,
      completedAt: null,
    };
    const sets = [...session.sets];
    sets.splice(insertAt, 0, extra);
    updateSets(sets.map((s, i) => ({ ...s, order: i })));
  };

  const removeLastSet = (slug: string) => {
    const entries = groups.find((g) => g.slug === slug)?.entries ?? [];
    const last = [...entries].reverse().find((e) => e.set.kind === 'hard' && !e.set.completed);
    if (!last) return;
    const hardCount = entries.filter((e) => e.set.kind === 'hard').length;
    if (hardCount <= 1) return;
    updateSets(session.sets.filter((_, i) => i !== last.index));
  };

  const finish = () => {
    const completed = {
      ...session,
      notes,
      completedAt: new Date().toISOString(),
      // Sets that were never ticked are dropped: only real work is recorded.
      sets: session.sets.filter((s) => s.completed),
    };
    upsertSession(completed);
    setExerciseStates(updateExerciseStates(completed, exerciseStates));
    setActiveSession(null);
    setFinishOpen(false);
    navigate(`/history/${completed.id}`, { replace: true });
  };

  const discard = () => {
    removeSession(session.id);
    setActiveSession(null);
    setDiscardOpen(false);
    navigate('/', { replace: true });
  };

  const nextSet = activeIndex >= 0 ? session.sets[activeIndex] : null;
  const nextLabel = nextSet
    ? `${getExercise(nextSet.exerciseSlug).name} — ${
        isTimed(getExercise(nextSet.exerciseSlug).load) ? `${nextSet.reps}s` : `${nextSet.reps} reps`
      }${nextSet.weight != null ? ` @ ${formatWeight(nextSet.weight, nextSet.unit)}` : ''}`
    : null;

  return (
    <>
      <div className="session-bar">
        <button
          type="button"
          className="btn btn--icon btn--ghost"
          onClick={() => navigate('/')}
          aria-label="Back"
        >
          <IconClose />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="session-bar-title">{session.workoutName}</div>
          <div className="session-bar-sub num">
            {formatDuration(elapsed)} · {doneHard}/{totalHard} hard sets
            {session.isDeload ? ' · deload' : ''}
          </div>
        </div>
        <button
          type="button"
          className={allDone ? 'btn btn--sm btn--success' : 'btn btn--sm'}
          onClick={() => setFinishOpen(true)}
        >
          Finish
        </button>
      </div>
      <div className="session-progress">
        <span style={{ width: `${totalHard ? (doneHard / totalHard) * 100 : 0}%` }} />
      </div>

      <div
        className="screen screen--flush"
        style={{ paddingTop: 14, paddingBottom: rest.running ? 116 : undefined }}
      >
        {session.isDeload ? (
          <div className="banner banner--deload" style={{ marginBottom: 12 }}>
            Deload week — light and easy. Two sets of three reps at your last hard-set weight. Do
            not push these.
          </div>
        ) : null}

        <div className="stack" style={{ gap: 12 }}>
          {groups.map((group, groupIndex) => {
            const exercise = getExercise(group.slug);
            const expanded = expandedSlug === group.slug;
            const hardEntries = group.entries.filter((e) => e.set.kind === 'hard');
            const warmEntries = group.entries.filter((e) => e.set.kind === 'warmup');
            const groupDone = group.entries.every((e) => e.set.completed);
            const doneCount = hardEntries.filter((e) => e.set.completed).length;
            const warmVisible = showWarmups[group.slug] ?? true;
            const state = exerciseStates[group.slug];

            return (
              <section
                key={`${group.slug}-${groupIndex}`}
                className={groupDone ? 'exercise exercise--done' : 'exercise'}
              >
                <button
                  type="button"
                  className="exercise-head"
                  onClick={() => setOpenSlug(expanded ? '' : group.slug)}
                  aria-expanded={expanded}
                >
                  <span className="exercise-badge">
                    {groupDone ? <IconCheck /> : groupIndex + 1}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="exercise-title" style={{ display: 'block' }}>
                      {exercise.name}
                    </span>
                    <span className="exercise-meta" style={{ display: 'block' }}>
                      {doneCount}/{hardEntries.length} sets
                      {session.isDeload
                        ? ' · deload'
                        : ` · target ${exercise.repRange[0]}–${exercise.repRange[1]}${
                            isTimed(exercise.load) ? 's' : ' reps'
                          }`}
                      {state?.lastWeight != null && usesWeight(exercise.load)
                        ? ` · last ${formatWeight(state.lastWeight, state.unit)}`
                        : ''}
                    </span>
                  </span>
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--text-faint)',
                      transform: expanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.18s ease',
                    }}
                  >
                    <IconChevronDown />
                  </span>
                </button>

                {expanded ? (
                  <div className="exercise-body">
                    {exercise.cue ? <p className="exercise-cue">{exercise.cue}</p> : null}

                    {warmEntries.length > 0 ? (
                      <>
                        <button
                          type="button"
                          className="warmup-toggle"
                          onClick={() =>
                            setShowWarmups((prev) => ({
                              ...prev,
                              [group.slug]: !(prev[group.slug] ?? true),
                            }))
                          }
                        >
                          {warmVisible ? 'Hide' : 'Show'} warm-up ({warmEntries.length})
                        </button>
                        {warmVisible
                          ? warmEntries.map((entry, i) => (
                              <SetRow
                                key={entry.set.id}
                                set={entry.set}
                                exercise={exercise}
                                unit={settings.unit}
                                label={`W${i + 1}`}
                                active={entry.index === activeIndex}
                                showLabels={i === 0}
                                onChange={(patch) => editSet(entry.index, patch)}
                                onToggle={() => toggleSet(entry.index)}
                              />
                            ))
                          : null}
                      </>
                    ) : null}

                    {hardEntries.map((entry, i) => (
                      <SetRow
                        key={entry.set.id}
                        set={entry.set}
                        exercise={exercise}
                        unit={settings.unit}
                        label={String(i + 1)}
                        active={entry.index === activeIndex}
                        showLabels={i === 0 && (warmEntries.length === 0 || !warmVisible)}
                        onChange={(patch) => editSet(entry.index, patch)}
                        onToggle={() => toggleSet(entry.index)}
                      />
                    ))}

                    <div className="row" style={{ marginTop: 2 }}>
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => addSet(group.slug)}
                      >
                        + Add set
                      </button>
                      {hardEntries.length > 1 ? (
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost"
                          onClick={() => removeLastSet(group.slug)}
                        >
                          − Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <div className="session-footer">
          <button
            type="button"
            className={allDone ? 'btn btn--success btn--block' : 'btn btn--primary btn--block'}
            onClick={() => setFinishOpen(true)}
          >
            Finish workout
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => setDiscardOpen(true)}
          >
            Discard workout
          </button>
        </div>
      </div>

      {rest.running ? (
        <RestBar
          remaining={rest.remaining}
          target={rest.target}
          nextLabel={nextLabel}
          onSkip={rest.stop}
          onAdd={rest.add}
        />
      ) : null}

      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title="Finish workout">
        <p className="sheet-text">
          {doneHard} of {totalHard} hard sets logged in {formatDuration(elapsed)}. Sets you did not
          tick off will not be saved.
        </p>
        <textarea
          className="textarea"
          placeholder="Notes — how it felt, niggles, gym was packed…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ marginBottom: 14 }}
        />
        <div className="stack">
          <button type="button" className="btn btn--success btn--block" onClick={finish}>
            Save workout
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => setFinishOpen(false)}
          >
            Keep going
          </button>
        </div>
      </Sheet>

      <Sheet open={discardOpen} onClose={() => setDiscardOpen(false)} title="Discard this workout?">
        <p className="sheet-text">
          Everything logged in this session is deleted and your program position stays where it is.
        </p>
        <div className="stack">
          <button type="button" className="btn btn--danger btn--block" onClick={discard}>
            Discard
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => setDiscardOpen(false)}
          >
            Cancel
          </button>
        </div>
      </Sheet>
    </>
  );
}
