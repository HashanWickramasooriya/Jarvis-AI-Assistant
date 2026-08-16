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

/** Seven systems, each with its own "coming online" beat — see the timeline
 * in useBootSequence's docstring for exact timing. */
const BOOT_STAGES: BootStage[] = [
  { key: "power", label: "POWER SYSTEM", activeLabel: "INITIALIZING...", doneLabel: "ONLINE" },
  { key: "core", label: "CORE SYSTEM", activeLabel: "INITIALIZING...", doneLabel: "ONLINE" },
  { key: "memory", label: "MEMORY SYSTEM", activeLabel: "INITIALIZING...", doneLabel: "READY" },
  { key: "neural", label: "NEURAL INTERFACE", activeLabel: "INITIALIZING...", doneLabel: "ONLINE" },
  { key: "voice", label: "VOICE INTERFACE", activeLabel: "INITIALIZING...", doneLabel: "READY" },
  { key: "security", label: "SECURITY SYSTEM", activeLabel: "CHECKING...", doneLabel: "SECURE" },
  { key: "diagnostics", label: "SYSTEM DIAGNOSTICS", activeLabel: "RUNNING...", doneLabel: "COMPLETE" },
];

/** Core-intensity checkpoint reached as each stage finishes (intro, then
 * one per BOOT_STAGES entry, then all-systems-online, then final online). */
const CORE_INTENSITY_CHECKPOINTS = [0.1, 0.2, 0.3, 0.42, 0.55, 0.68, 0.8, 0.9, 0.97, 1];

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
  /** How many of the diagnostics sub-indicators have lit up (0-4). */
  diagnosticsTicks: number;
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
  diagnosticsTicks: 0,
  allSystemsOnline: false,
  online: false,
  coreIntensity: 0,
};

const DIAGNOSTICS_STAGE_INDEX = BOOT_STAGES.findIndex((s) => s.key === "diagnostics");

/**
 * Desktop-only cinematic boot sequence, once per page load. ~20s timeline,
 * one fixed 2-second beat per step:
 *
 *   0-2s    intro: "J.A.R.V.I.S / INITIALIZATION STARTING..." + opening tone
 *   2-4s    POWER SYSTEM: initializing -> ONLINE
 *   4-6s    CORE SYSTEM: initializing -> ONLINE
 *   6-8s    MEMORY SYSTEM: initializing -> READY
 *   8-10s   NEURAL INTERFACE: initializing -> ONLINE
 *   10-12s  VOICE INTERFACE: initializing -> READY (no API call — purely visual)
 *   12-14s  SECURITY SYSTEM: checking -> SECURE
 *   14-16s  SYSTEM DIAGNOSTICS: running (small indicator ticks) -> COMPLETE
 *   16-18s  "ALL SYSTEMS ONLINE"
 *   18-20s  "J.A.R.V.I.S / ONLINE" — core reaches full intensity, held
 *   20s+    fade out, then the welcome line is spoken (only now, never
 *           mid-initialization) via the existing speak() pipeline.
 *
 * IMPORTANT — prefers-reduced-motion affects ANIMATION INTENSITY, not
 * CONTENT PACING: an earlier version of this hook also scaled every JS
 * timer to 2% of its normal duration under that preference, on the theory
 * that reduced motion should mean "get it over with fast". That's a
 * misreading of the media feature (it's about vestibular-triggering motion
 * — spinning, pulsing, parallax — not about how long informational text
 * stays on screen) and it was a real, confirmed bug: with reduced motion
 * on, the whole ~8s sequence of the previous version collapsed to ~170ms
 * of scheduled time, and measuring the actual DOM-visible lifetime in a
 * real browser showed the overlay was on screen for barely over a second
 * before disappearing — exactly the "boot screen vanishes instantly"
 * report this rewrite fixes. The stage timing below is now IDENTICAL
 * regardless of motion preference. Motion reduction is handled entirely by
 * this project's existing global CSS rule (index.css), which already
 * collapses any `animate-*` keyframe animation and CSS transition to
 * near-zero duration for reduced-motion users — so the decorative ring
 * spin/pulse/fade effects become static/instant automatically, while the
 * readable stage-by-stage progression keeps its full, deliberate pacing.
 *
 * Every step is scheduled through the same `after()`/`timers` array,
 * including the very first state update — this is what lets React
 * StrictMode's dev-only mount->cleanup->mount double-invoke cancel the
 * first (phantom) pass in full while the second (real) pass completes
 * normally, with no separate "already ran" flag needed (a flag set at the
 * *start* of the effect would block that second, real invocation from ever
 * rescheduling the timers the first invocation's cleanup just cancelled).
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

    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    const STAGE_MS = 2000;
    const STAGE_ACTIVE_OFFSET = 1000; // "initializing" -> "done" midpoint, within each 2s stage
    const FADE_MS = 500;

    // Constructed only once the deferred guard below actually fires — on a
    // React StrictMode dev-only phantom pass (mount -> cleanup -> mount
    // again), that never happens for the cancelled first pass, so it never
    // constructs an AudioContext or plays a tone at all, not just "plays
    // one that gets thrown away".
    let audio: BootAudio | null = null;

    let namePromise: Promise<string | null> = Promise.resolve(null);
    let checkpoint = 0;
    const nextIntensity = () => CORE_INTENSITY_CHECKPOINTS[Math.min(checkpoint++, CORE_INTENSITY_CHECKPOINTS.length - 1)];

    after(0, () => {
      setState({ ...INITIAL_STATE, active: true, visible: true });
      audio = createBootAudio();
      audio.playOpening();
      namePromise = fetchMemories()
        .then((memories) => memories.find((m) => m.category === "identity" && m.key === "name")?.value ?? null)
        .catch(() => null);
    });

    let t = STAGE_MS; // intro occupies 0-2s
    after(t, () => setState((s) => ({ ...s, intro: false, coreIntensity: nextIntensity() })));

    BOOT_STAGES.forEach((_, i) => {
      const startAt = t;

      after(startAt, () =>
        setState((s) => {
          const stagePhases = [...s.stagePhases];
          stagePhases[i] = "active";
          return { ...s, stagePhases };
        })
      );

      // Diagnostics stage: a few small indicator ticks light up during its
      // active half, purely decorative (no real system being probed).
      if (i === DIAGNOSTICS_STAGE_INDEX) {
        [1, 2, 3, 4].forEach((n) => {
          after(startAt + (STAGE_ACTIVE_OFFSET * n) / 5, () =>
            setState((s) => ({ ...s, diagnosticsTicks: n }))
          );
        });
      }

      after(startAt + STAGE_ACTIVE_OFFSET, () => {
        audio?.playTick();
        setState((s) => {
          const stagePhases = [...s.stagePhases];
          stagePhases[i] = "done";
          return { ...s, stagePhases, coreIntensity: nextIntensity() };
        });
      });

      t = startAt + STAGE_MS;
    });

    const allSystemsAt = t;
    after(allSystemsAt, () => setState((s) => ({ ...s, allSystemsOnline: true, coreIntensity: nextIntensity() })));
    t = allSystemsAt + STAGE_MS;

    const onlineAt = t;
    after(onlineAt, () => {
      audio?.playConfirmation();
      setState((s) => ({ ...s, online: true, coreIntensity: nextIntensity() }));
    });
    t = onlineAt + STAGE_MS;

    const fadeStartAt = t;
    after(fadeStartAt, () => setState((s) => ({ ...s, visible: false })));
    after(fadeStartAt + FADE_MS, async () => {
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
