import { useJarvisStore } from "../../state/store";

const ITEMS: { label: string; key: "ai" | "memory" | "stt" | "tts" }[] = [
  { label: "AI CORE", key: "ai" },
  { label: "MEMORY", key: "memory" },
  { label: "MIC", key: "stt" },
  { label: "VOICE", key: "tts" },
];

/**
 * Ultra-compact single-row system status readout for small screens, where
 * the full StatusPanel would consume too much vertical space to keep the
 * core + conversation both visible without scrolling.
 */
export function StatusStrip() {
  const serviceStatus = useJarvisStore((s) => s.serviceStatus);

  return (
    <div
      className="hud-panel flex shrink-0 items-center justify-center gap-5 overflow-x-auto rounded-sm px-3 py-2 sm:gap-8"
      role="status"
      aria-label="System status summary"
    >
      {ITEMS.map((item) => {
        const value = serviceStatus?.[item.key];
        const isOnline = value === "online" || value === "ready";
        return (
          <div key={item.key} className="flex shrink-0 items-center gap-1.5 text-[9px] tracking-widest">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                serviceStatus === null
                  ? "bg-[var(--jarvis-text-faint)]"
                  : isOnline
                  ? "bg-[var(--jarvis-ok)]"
                  : "bg-[var(--jarvis-err)]"
              }`}
            />
            <span className="text-[var(--jarvis-text-dim)]">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
