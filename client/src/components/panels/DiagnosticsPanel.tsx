import { useEffect, useRef, useState } from "react";
import { useJarvisStore } from "../../state/store";

interface DiagnosticsPanelProps {
  open: boolean;
  onClose: () => void;
  level: number;
}

const ROWS: { label: string; key: "ai" | "memory" | "stt" | "tts" | "search" | "network"; onWord: string; offWord: string }[] = [
  { label: "BACKEND CONNECTION", key: "network", onWord: "CONNECTED", offWord: "UNREACHABLE" },
  { label: "DATABASE CONNECTION", key: "memory", onWord: "SYNCHRONIZED", offWord: "OFFLINE" },
  { label: "COGNITIVE CORE", key: "ai", onWord: "ACTIVE", offWord: "OFFLINE" },
  { label: "VOICE INPUT", key: "stt", onWord: "READY", offWord: "OFFLINE" },
  { label: "VOICE OUTPUT", key: "tts", onWord: "READY", offWord: "OFFLINE" },
  { label: "EXTERNAL DATA", key: "search", onWord: "ONLINE", offWord: "STANDBY" },
];

const SAMPLE_COUNT = 48;

export function DiagnosticsPanel({ open, onClose, level }: DiagnosticsPanelProps) {
  const serviceStatus = useJarvisStore((s) => s.serviceStatus);
  const messages = useJarvisStore((s) => s.messages);
  const sessionId = useJarvisStore((s) => s.sessionId);
  const [samples, setSamples] = useState<number[]>(() => new Array(SAMPLE_COUNT).fill(0));
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      setSamples((prev) => [...prev.slice(1), level]);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [open, level]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Diagnostics panel"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="hud-panel relative w-full max-w-lg overflow-hidden rounded-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="hud-corner hud-corner-tl" />
        <span className="hud-corner hud-corner-br" />

        <div className="flex items-center justify-between border-b border-[var(--jarvis-border)] px-4 py-3">
          <h2 className="hud-panel-title">SYSTEM DIAGNOSTICS</h2>
          <button
            onClick={onClose}
            aria-label="Close diagnostics panel"
            className="text-xs text-[var(--jarvis-text-dim)] hover:text-[var(--jarvis-text)] focus-visible:outline-2 focus-visible:outline-[var(--jarvis-accent)]"
          >
            CLOSE
          </button>
        </div>

        <div className="space-y-5 px-4 py-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            {ROWS.map((row) => {
              const value = serviceStatus?.[row.key];
              const isOnline = value === "online" || value === "ready";
              return (
                <div key={row.key} className="col-span-2 flex items-center justify-between border-b border-[var(--jarvis-border)] pb-2">
                  <dt className="hud-label">{row.label}</dt>
                  <dd
                    className={`hud-mono flex items-center gap-1.5 ${
                      serviceStatus === null
                        ? "text-[var(--jarvis-text-faint)]"
                        : isOnline
                        ? "text-[var(--jarvis-ok)]"
                        : "text-[var(--jarvis-warn)]"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        serviceStatus === null
                          ? "bg-[var(--jarvis-text-faint)]"
                          : isOnline
                          ? "bg-[var(--jarvis-ok)]"
                          : "bg-[var(--jarvis-warn)]"
                      }`}
                    />
                    {serviceStatus === null ? "..." : isOnline ? row.onWord : row.offWord}
                  </dd>
                </div>
              );
            })}
          </dl>

          <div>
            <div className="hud-label mb-2">LIVE AUDIO ACTIVITY</div>
            <div className="flex h-10 items-end gap-[2px]" aria-hidden>
              {samples.map((s, i) => (
                <span
                  key={i}
                  className="flex-1 bg-[var(--jarvis-accent)]"
                  style={{ height: `${Math.max(4, s * 100)}%`, opacity: 0.3 + s * 0.7 }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-2 border-t border-[var(--jarvis-border)] pt-3 text-[11px]">
            <span className="hud-label">SESSION MESSAGES</span>
            <span className="hud-mono text-right text-[var(--jarvis-text)]">{messages.length}</span>
            <span className="hud-label">SESSION ID</span>
            <span className="hud-mono truncate text-right text-[var(--jarvis-text-faint)]">
              {sessionId.slice(0, 8)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
