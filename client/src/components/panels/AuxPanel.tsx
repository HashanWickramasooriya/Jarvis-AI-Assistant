import { Clock } from "./Clock";

/**
 * Fills the remaining vertical space beneath the status panel with a live
 * HUD clock and a decorative technical readout, so the left column doesn't
 * dead-end in empty space above the fold.
 */
export function AuxPanel() {
  return (
    <div className="hud-panel relative mt-auto rounded-sm p-4">
      <span className="hud-corner hud-corner-tl" />
      <span className="hud-corner hud-corner-br" />
      <h2 className="hud-panel-title mb-3">LOCAL TIME</h2>
      <Clock />
      <div className="mt-4 flex gap-[2px]" aria-hidden>
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="h-3 flex-1 bg-[var(--jarvis-border)]"
            style={{ opacity: 0.3 + (i % 5) * 0.12 }}
          />
        ))}
      </div>
    </div>
  );
}
