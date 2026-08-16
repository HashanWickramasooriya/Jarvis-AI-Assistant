import { useEffect, useRef, useState } from "react";
import { fetchMemories } from "../lib/api";
import { createBootAudio } from "../lib/startupChime";
import type { BootAudio } from "../lib/startupChime";

export interface BootStage {
  key: string;
  label: string;
  activeLabel: string;
  doneLabel: string;
}

/** Six systems, each with its own "coming online" beat — see the timeline
 * in useBootSequence's docstring for exact timing. */
const BOOT_STAGES: BootStage[] = [
  { key: "power", label: "POWER SYSTEM", activeLabel: "INITIALIZING...", doneLabel: "ONLINE" },
  { key: "core", label: "CORE SYSTEM", activeLabel: "INITIALIZING...", doneLabel: "ONLINE" },
  { key: "memory", label: "MEMORY SYSTEM", activeLabel: "INITIALIZING...", doneLabel: "READY" },
  { key: "neural", label: "NEURAL INTERFACE", activeLabel: "INITIALIZING...", doneLabel: "ONLINE" },
  { key: "voice", label: "VOICE INTERFACE", activeLabel: "INITIALIZING...", doneLabel: "READY" },
  { key: "security", label: "SECURITY SYSTEM", activeLabel: "CHECKING...", doneLabel: "SECURE" },
];

export type StagePhase = "pending" | "active" | "done";

export interface BootSequenceState {
  /** Overlay should be rendered (mounted) at all. */
  active: boolean;
  /** Overlay is visible; false during its final fade-out. */
  visible: boolean;
  /** "INITIALIZATION STARTING..." intro line still showing (before any stage starts). */
  intro: boolean;
  /** Per-stage phase, same order as BOOT_STAGES. */
  stagePhases: StagePhase[];
  /** "ALL SYSTEMS ONLINE" checkpoint reached. */
  allSystemsOnline: boolean;
  /** Final "J.A.R.V.I.S / ONLINE" state reached — core is fully active here. */
  online: boolean;
  /** 0..1 — drives the evolving central core visual (dim -> full glow). */
  coreIntensity: number;
}

const INITIAL_STATE: BootSequenceState = {
  active: false,
  visible: false,
  intro: true,
  stagePhases: BOOT_STAGES.map(() => "pending"),
  allSystemsOnline: false,
  online: false,
  coreIntensity: 0,
};

/**
 * Desktop-only cinematic boot sequence, once per page load. ~8s timeline:
 *
 *   0.0-0.8s   intro: "J.A.R.V.I.S / INITIALIZATION STARTING..." + opening tone
 *   0.8-1.8s   POWER SYSTEM: initializing -> ONLINE
 *   1.8-2.8s   CORE SYSTEM: initializing -> ONLINE
 *   2.8-3.8s   MEMORY SYSTEM: initializing -> READY
 *   3.8-4.8s   NEURAL INTERFACE: initializing -> ONLINE
 *   4.8-5.8s   VOICE INTERFACE: initializing -> READY (no API call — purely visual)
 *   5.8-6.6s   SECURITY SYSTEM: checking -> SECURE
 *   6.6-7.2s   "ALL SYSTEMS ONLINE"
 *   7.2-8.0s   "J.A.R.V.I.S / ONLINE" — core reaches full intensity
 *   8.0s+      fade out, then the welcome line is spoken (only now, never
 *              mid-initialization) via the existing speak() pipeline.
 *
 * Every step is scheduled through the same `after()`/`timers` array,
 * including the very first state update — this is what lets React
 * StrictMode's dev-only mount->cleanup->mount double-invoke cancel the
 * first (phantom) pass in full while the second (real) pass completes
 * normally, with no separate "already ran" flag needed (a flag set at the
 * *start* of the effect would block that second, real invocation from ever
 * rescheduling the timers the first invocation's cleanup just cancelled —
 * this was a real bug in an earlier version of this hook).
 *
 * `resolvedRef` is the actual once-per-load guard: true once the sequence
 * has either completed or been cancelled (window resized to mobile mid-
 * boot). Once resolved, later changes to `enabled` never restart or replay
 * it — including resizing back to desktop after a mobile-triggered cancel.
 */
export function useBootSequence(enabled: boolean, speak: (text: string) => Promise<void>): BootSequenceState {
  const [state, setState] = useState<BootSequenceState>(INITIAL_STATE);
  const resolvedRef = useRef(false);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      // Desktop -> mobile mid-boot: cancel cleanly and never retry, even if
      // resized back to desktop later.
      if (runningRef.current && !resolvedRef.current) {
        resolvedRef.current = true;
        runningRef.current = false;
        setState(INITIAL_STATE);
      }
      return;
    }
    if (resolvedRef.current) return;

    runningRef.current = true;

    const reducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    // Reduced motion: same structure, compressed to a small fraction of the
    // real timing so nothing about the sequence is heavy or slow, per
    // prefers-reduced-motion — still resolves the identity lookup and
    // still speaks the welcome line exactly once.
    const scale = reducedMotion ? 0.02 : 1;
    const introEnd = 800 * scale;
    const stageDuration = 1000 * scale; // power/core/memory/neural/voice
    const stageActiveOffset = 500 * scale; // "initializing" -> "done" midpoint
    const securityDuration = 800 * scale;
    const securityActiveOffset = 400 * scale;
    const allSystemsDuration = 600 * scale;
    const finalOnlineDuration = 800 * scale;
    const fadeDuration = reducedMotion ? 120 : 450;

    // Constructed only once the deferred guard below actually fires — on a
    // React StrictMode dev-only phantom pass (mount -> cleanup -> mount
    // again), that never happens for the cancelled first pass, so it never
    // constructs an AudioContext or plays a tone at all, not just "plays
    // one that gets thrown away".
    let audio: BootAudio | null = null;

    let namePromise: Promise<string | null> = Promise.resolve(null);

    after(0, () => {
      setState({ ...INITIAL_STATE, active: true, visible: true });
      audio = createBootAudio();
      audio.playOpening();
      namePromise = fetchMemories()
        .then((memories) => memories.find((m) => m.category === "identity" && m.key === "name")?.value ?? null)
        .catch(() => null);
    });

    let t = introEnd;
    after(t, () => setState((s) => ({ ...s, intro: false, coreIntensity: 0.15 })));

    BOOT_STAGES.forEach((_, i) => {
      const isSecurity = i === BOOT_STAGES.length - 1;
      const duration = isSecurity ? securityDuration : stageDuration;
      const activeOffset = isSecurity ? securityActiveOffset : stageActiveOffset;
      const startAt = t;

      after(startAt, () =>
        setState((s) => {
          const stagePhases = [...s.stagePhases];
          stagePhases[i] = "active";
          return { ...s, stagePhases, coreIntensity: 0.15 + 0.55 * ((i + 0.5) / BOOT_STAGES.length) };
        })
      );
      after(startAt + activeOffset, () => {
        audio?.playTick();
        setState((s) => {
          const stagePhases = [...s.stagePhases];
          stagePhases[i] = "done";
          return { ...s, stagePhases, coreIntensity: 0.15 + 0.55 * ((i + 1) / BOOT_STAGES.length) };
        });
      });

      t = startAt + duration;
    });

    const allSystemsAt = t;
    after(allSystemsAt, () => setState((s) => ({ ...s, allSystemsOnline: true, coreIntensity: 0.85 })));
    t = allSystemsAt + allSystemsDuration;

    const onlineAt = t;
    after(onlineAt, () => {
      audio?.playConfirmation();
      setState((s) => ({ ...s, online: true, coreIntensity: 1 }));
    });
    t = onlineAt + finalOnlineDuration;

    const fadeStartAt = t;
    after(fadeStartAt, () => setState((s) => ({ ...s, visible: false })));
    after(fadeStartAt + fadeDuration, async () => {
      resolvedRef.current = true;
      runningRef.current = false;
      audio?.dispose();
      setState((s) => ({ ...s, active: false }));
      const name = await namePromise;
      const welcome = name ? `Welcome back, ${name}. JARVIS is ready.` : "Welcome. JARVIS is ready.";
      void speak(welcome);
    });

    return () => {
      timers.forEach(clearTimeout);
      audio?.dispose();
    };
    // Intentionally excludes `speak`: it's stable in practice (useCallback
    // in useAssistant) and re-running this effect on every identity change
    // of that function would risk re-triggering the sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return state;
}

export { BOOT_STAGES };
