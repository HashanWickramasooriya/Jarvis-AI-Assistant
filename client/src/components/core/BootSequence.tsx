import { BOOT_LINES } from "../../hooks/useBootSequence";
import type { BootSequenceState } from "../../hooks/useBootSequence";

interface BootSequenceProps {
  state: BootSequenceState;
}

/**
 * Desktop-only startup overlay. Purely presentational — see
 * useBootSequence for the timing/state machine. Reuses the existing HUD
 * design tokens (--jarvis-*, hud-mono) so it reads as part of the same
 * interface rather than a separate "intro screen".
 */
export function BootSequence({ state }: BootSequenceProps) {
  if (!state.active) return null;

  return (
    <div
      aria-hidden={!state.visible}
      role="status"
      aria-label="JARVIS initializing"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[var(--jarvis-bg)] transition-opacity duration-[420ms] ease-out ${
        state.visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-6 px-6">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-[var(--jarvis-border-accent)] animate-spin-slow" />
          <span className="absolute inset-2 rounded-full border border-[var(--jarvis-border)] animate-spin-reverse" />
          <span className="h-2 w-2 rounded-full bg-[var(--jarvis-accent)] animate-breathe" />
        </div>

        <div className="hud-mono text-[11px] tracking-[0.3em] text-[var(--jarvis-text-faint)] animate-fade-in">
          {state.online ? "JARVIS" : "INITIALIZING JARVIS..."}
        </div>

        <div className="flex w-full flex-col items-center gap-1.5">
          {BOOT_LINES.slice(0, state.lineCount).map((line) => (
            <div
              key={line.label}
              className="hud-mono flex w-full items-center justify-between text-[10px] tracking-[0.2em] text-[var(--jarvis-text-dim)] animate-fade-in"
            >
              <span>{line.label}</span>
              <span className="text-[var(--jarvis-ok)]">{line.status}</span>
            </div>
          ))}
        </div>

        {state.online && (
          <div className="hud-mono text-sm tracking-[0.35em] text-[var(--jarvis-accent-bright)] animate-fade-in">
            ONLINE
          </div>
        )}
      </div>
    </div>
  );
}
