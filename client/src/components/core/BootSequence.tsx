import { BOOT_STAGES } from "../../hooks/useBootSequence";
import type { BootSequenceState } from "../../hooks/useBootSequence";

interface BootSequenceProps {
  state: BootSequenceState;
}

/**
 * Desktop-only startup overlay. Purely presentational — see
 * useBootSequence for the timing/state machine. Reuses the existing HUD
 * design tokens (--jarvis-*, hud-mono) and animation utilities so it reads
 * as part of the same interface rather than a separate "intro screen". The
 * central core is a CSS-only construct (not the real WebGL AICore, which
 * is already mounted underneath this overlay in the main app — reusing it
 * here would mean two simultaneous WebGL contexts, which this project
 * explicitly avoids) whose opacity/scale evolve with `coreIntensity`.
 */
export function BootSequence({ state }: BootSequenceProps) {
  if (!state.active) return null;

  const headline = state.online ? "J.A.R.V.I.S" : state.intro ? "J.A.R.V.I.S" : "SYSTEM INITIALIZATION";

  return (
    <div
      aria-hidden={!state.visible}
      role="status"
      aria-label="JARVIS initializing"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[var(--jarvis-bg)] transition-opacity duration-[450ms] ease-out ${
        state.visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-7 px-6">
        <div
          className="relative flex h-24 w-24 items-center justify-center transition-transform duration-500 ease-out"
          style={{ transform: `scale(${0.88 + state.coreIntensity * 0.12})` }}
        >
          <span
            className="absolute inset-0 rounded-full border animate-spin-slow transition-opacity duration-500"
            style={{
              borderColor: "var(--jarvis-border-accent)",
              opacity: 0.3 + state.coreIntensity * 0.7,
            }}
          />
          <span
            className="absolute inset-3 rounded-full border animate-spin-reverse transition-opacity duration-500"
            style={{ borderColor: "var(--jarvis-border)", opacity: 0.25 + state.coreIntensity * 0.6 }}
          />
          <span
            className="absolute inset-7 rounded-full transition-opacity duration-500"
            style={{
              boxShadow: `0 0 ${16 + state.coreIntensity * 40}px ${state.coreIntensity * 10}px var(--jarvis-accent-glow)`,
              opacity: state.coreIntensity,
            }}
          />
          <span
            className={`h-2.5 w-2.5 rounded-full bg-[var(--jarvis-accent)] transition-transform duration-500 ${
              state.coreIntensity > 0.1 ? "animate-breathe" : ""
            }`}
            style={{ transform: `scale(${0.6 + state.coreIntensity * 0.7})` }}
          />
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="hud-mono text-sm tracking-[0.35em] text-[var(--jarvis-text)] animate-fade-in">
            {headline}
          </div>
          {state.intro && (
            <div className="hud-mono text-[10px] tracking-[0.25em] text-[var(--jarvis-text-faint)] animate-fade-in">
              INITIALIZATION STARTING...
            </div>
          )}
          {state.online && (
            <div className="hud-mono text-[11px] tracking-[0.4em] text-[var(--jarvis-accent-bright)] animate-fade-in">
              ONLINE
            </div>
          )}
        </div>

        {!state.intro && !state.online && (
          <div className="flex w-full flex-col items-center gap-1.5">
            {BOOT_STAGES.map((stage, i) => {
              const phase = state.stagePhases[i];
              if (phase === "pending") return null;
              return (
                <div
                  key={stage.key}
                  className="hud-mono flex w-full items-center justify-between text-[10px] tracking-[0.18em] text-[var(--jarvis-text-dim)] animate-fade-in"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full ${
                        phase === "done"
                          ? "bg-[var(--jarvis-ok)]"
                          : "bg-[var(--jarvis-accent)] animate-pulse-fast"
                      }`}
                    />
                    {stage.label}
                  </span>
                  <span className={phase === "done" ? "text-[var(--jarvis-ok)]" : "text-[var(--jarvis-text-faint)]"}>
                    {phase === "done" ? stage.doneLabel : stage.activeLabel}
                  </span>
                </div>
              );
            })}
            {state.allSystemsOnline && (
              <div className="hud-mono mt-2 text-[10px] tracking-[0.3em] text-[var(--jarvis-accent-bright)] animate-fade-in">
                ALL SYSTEMS ONLINE
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
