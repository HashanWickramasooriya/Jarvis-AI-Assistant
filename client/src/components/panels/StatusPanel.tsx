import { useJarvisStore } from "../../state/store";

const ROWS: {
  label: string;
  key: "ai" | "memory" | "stt" | "tts" | "search" | "network";
  onWord: string;
  offWord: string;
}[] = [
  { label: "COGNITIVE CORE", key: "ai", onWord: "ACTIVE", offWord: "OFFLINE" },
  { label: "MEMORY CORE", key: "memory", onWord: "SYNCHRONIZED", offWord: "OFFLINE" },
  { label: "VOICE INPUT", key: "stt", onWord: "READY", offWord: "OFFLINE" },
  { label: "VOICE OUTPUT", key: "tts", onWord: "READY", offWord: "OFFLINE" },
  { label: "EXTERNAL DATA", key: "search", onWord: "ONLINE", offWord: "STANDBY" },
  { label: "NETWORK", key: "network", onWord: "CONNECTED", offWord: "OFFLINE" },
];

export function StatusPanel() {
  const serviceStatus = useJarvisStore((s) => s.serviceStatus);

  return (
    <div className="hud-panel relative rounded-sm p-4">
      <span className="hud-corner hud-corner-tl" />
      <span className="hud-corner hud-corner-br" />
      <h2 className="hud-panel-title mb-3">SYSTEM DIAGNOSTICS</h2>
      <dl className="space-y-2.5">
        {ROWS.map((row) => {
          const value = serviceStatus?.[row.key];
          const isOnline = value === "online" || value === "ready";
          const isStandby = row.key === "search" && !isOnline;
          return (
            <div key={row.key} className="flex items-center justify-between text-xs">
              <dt className="hud-label">{row.label}</dt>
              <dd
                className={`hud-mono flex items-center gap-1.5 ${
                  serviceStatus === null
                    ? "text-[var(--jarvis-text-faint)]"
                    : isOnline
                    ? "text-[var(--jarvis-ok)]"
                    : isStandby
                    ? "text-[var(--jarvis-warn)]"
                    : "text-[var(--jarvis-err)]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    serviceStatus === null
                      ? "bg-[var(--jarvis-text-faint)]"
                      : isOnline
                      ? "bg-[var(--jarvis-ok)] animate-pulse-fast"
                      : isStandby
                      ? "bg-[var(--jarvis-warn)]"
                      : "bg-[var(--jarvis-err)]"
                  }`}
                />
                {serviceStatus === null ? "..." : isOnline ? row.onWord : row.offWord}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
