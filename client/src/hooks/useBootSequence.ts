import { useEffect, useRef, useState } from "react";
import { fetchMemories } from "../lib/api";
import { playStartupChime } from "../lib/startupChime";

export interface BootLine {
  label: string;
  status: string;
}

const BOOT_LINES: BootLine[] = [
  { label: "CORE SYSTEMS", status: "ONLINE" },
  { label: "MEMORY", status: "READY" },
  { label: "VOICE INTERFACE", status: "READY" },
  { label: "NEURAL INTERFACE", status: "READY" },
];

export interface BootSequenceState {
  /** Overlay should be rendered (mounted) at all. */
  active: boolean;
  /** Overlay is visible; false during its final fade-out. */
  visible: boolean;
  /** How many of BOOT_LINES have appeared so far. */
  lineCount: number;
  /** Final "JARVIS ONLINE" line has appeared. */
  online: boolean;
}

/**
 * Desktop-only cinematic boot sequence, once per page load. Fires the
 * startup chime, steps through a short status-line sequence on a fixed
 * timer (purely presentational — not gated on real backend health, which
 * is already tracked independently by useServiceStatus/StatusPanel), then
 * hands off to `speak` for a short welcome line once the overlay has
 * finished fading. The identity/name lookup (for personalizing the
 * welcome) reuses the existing device-scoped memory endpoint — no new
 * memory system, no assumption that the creator is the current user.
 */
export function useBootSequence(enabled: boolean, speak: (text: string) => Promise<void>): BootSequenceState {
  const [state, setState] = useState<BootSequenceState>({
    active: false,
    visible: false,
    lineCount: 0,
    online: false,
  });
  // Guards against a genuine replay (e.g. resizing back above the desktop
  // breakpoint after the sequence already finished once) — NOT against
  // React StrictMode's dev-only double-invoke of this effect. Everything
  // below, including the chime and the very first state update, is
  // scheduled through the same `after()`/`timers` mechanism specifically
  // so StrictMode's mount->cleanup->mount cycle cancels the first
  // (immediately-cleaned-up) pass in full and only the surviving pass ever
  // actually fires — no separate "already ran" flag needed to prevent
  // that, and none was reliable for it (a flag set at the *start* of the
  // effect blocks the second, real invocation from ever rescheduling the
  // timers the first invocation's cleanup had just cancelled).
  const completedRef = useRef(false);

  useEffect(() => {
    if (!enabled || completedRef.current) return;

    const reducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    const lineStep = reducedMotion ? 60 : 400;
    const onlineDelay = reducedMotion ? 260 : 2100;
    const fadeStartDelay = reducedMotion ? 420 : 2700;
    const fadeDuration = reducedMotion ? 120 : 420;

    after(0, () => {
      setState({ active: true, visible: true, lineCount: 0, online: false });
      playStartupChime();
    });

    // Look up this device's stored name (if any) in parallel with the
    // visual sequence — never assume the creator is the current user.
    // Kicked off inside the same after(0, ...) guard as everything else so
    // a cancelled (StrictMode phantom) pass never fires it either.
    let namePromise: Promise<string | null> = Promise.resolve(null);
    after(0, () => {
      namePromise = fetchMemories()
        .then((memories) => memories.find((m) => m.category === "identity" && m.key === "name")?.value ?? null)
        .catch(() => null);
    });

    BOOT_LINES.forEach((_, i) => {
      after(lineStep * (i + 1), () => setState((s) => ({ ...s, lineCount: i + 1 })));
    });
    after(onlineDelay, () => setState((s) => ({ ...s, online: true })));
    after(fadeStartDelay, () => setState((s) => ({ ...s, visible: false })));
    after(fadeStartDelay + fadeDuration, async () => {
      completedRef.current = true;
      setState((s) => ({ ...s, active: false }));
      const name = await namePromise;
      const welcome = name ? `Welcome back, ${name}. JARVIS is ready.` : "Welcome. JARVIS is ready.";
      void speak(welcome);
    });

    return () => timers.forEach(clearTimeout);
    // Intentionally excludes `speak`: it's stable in practice (useCallback
    // in useAssistant) and re-running this effect on every identity change
    // of that function would risk re-triggering the sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return state;
}

export { BOOT_LINES };
