import type { AssistantStatus } from "../../types";
import { AICore } from "./AICore";
import { CoreErrorBoundary } from "./CoreErrorBoundary";
import { StaticCore } from "./StaticCore";

const STATUS_LABEL: Record<AssistantStatus, string> = {
  idle: "STANDING BY",
  listening: "LISTENING",
  processing: "PROCESSING AUDIO",
  thinking: "ANALYZING",
  speaking: "RESPONDING",
  error: "ATTENTION REQUIRED",
  offline: "CORE OFFLINE",
};

const STATUS_DOT: Record<AssistantStatus, string> = {
  idle: "bg-[var(--jarvis-accent)]",
  listening: "bg-[var(--jarvis-ok)]",
  processing: "bg-[var(--jarvis-warn)]",
  thinking: "bg-[var(--jarvis-accent)]",
  speaking: "bg-[var(--jarvis-accent-bright)]",
  error: "bg-[var(--jarvis-err)]",
  offline: "bg-[var(--jarvis-text-faint)]",
};

interface CoreFrameProps {
  status: AssistantStatus;
  level: number;
  statusMessage?: string | null;
}

export function CoreFrame({ status, level, statusMessage }: CoreFrameProps) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-5">
      <div className="relative w-full" style={{ maxWidth: "clamp(160px, 55vw, 440px)" }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border border-[var(--jarvis-border)]"
          style={{ boxShadow: "0 0 90px rgba(77,235,255,0.07)" }}
        />
        <CoreErrorBoundary fallback={<StaticCore status={status} />}>
          <AICore status={status} level={level} />
        </CoreErrorBoundary>
      </div>
      <div className="flex flex-col items-center gap-1.5" role="status" aria-live="polite">
        <div className="flex items-center gap-2 text-xs tracking-[0.3em] text-[var(--jarvis-text-dim)]">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]} ${status !== "offline" ? "animate-pulse-fast" : ""}`} />
          {STATUS_LABEL[status]}
        </div>
        {statusMessage && (
          <div className="hud-mono text-[10px] tracking-widest text-[var(--jarvis-text-faint)] animate-fade-in">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}
