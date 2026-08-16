import { useEffect, useState } from "react";

const PHASES = ["ANALYZING REQUEST", "ESTABLISHING RESPONSE", "SYNTHESIZING"];
const PHASE_INTERVAL_MS = 900;

/** Cycles through cinematic "thinking" phase labels while `active` is true. */
export function useThinkingPhase(active: boolean): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PHASES.length);
    }, PHASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);

  return PHASES[index];
}
