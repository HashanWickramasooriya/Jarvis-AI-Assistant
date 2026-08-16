import { useEffect, useRef } from "react";
import { useJarvisStore } from "../../state/store";
import type { AssistantStatus } from "../../types";
import { useThinkingPhase } from "../../hooks/useThinkingPhase";

function formatTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

interface ConversationPanelProps {
  status?: AssistantStatus;
}

export function ConversationPanel({ status }: ConversationPanelProps) {
  const messages = useJarvisStore((s) => s.messages);
  const serviceStatus = useJarvisStore((s) => s.serviceStatus);
  const endRef = useRef<HTMLDivElement>(null);
  const thinkingPhase = useThinkingPhase(status === "thinking");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, status]);

  const aiOnline = serviceStatus?.ai === "online";

  return (
    <div className="hud-panel relative flex h-full flex-col overflow-hidden rounded-sm">
      <span className="hud-corner hud-corner-tl" />
      <span className="hud-corner hud-corner-br" />
      <div className="flex items-center justify-between border-b border-[var(--jarvis-border)] px-4 py-3">
        <h2 className="hud-panel-title">COMMAND LOG</h2>
        <div className="flex items-center gap-1.5 text-[9px] tracking-widest">
          <span className={`h-1.5 w-1.5 rounded-full ${aiOnline ? "bg-[var(--jarvis-ok)]" : "bg-[var(--jarvis-err)]"}`} />
          <span className={aiOnline ? "text-[var(--jarvis-ok)]" : "text-[var(--jarvis-err)]"}>
            J.A.R.V.I.S. {aiOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </div>

      <div className="hud-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="hud-mono text-xs text-[var(--jarvis-text-faint)]">
            NO ACTIVE LOG ENTRIES — awaiting first command.
          </p>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="animate-fade-in border-l border-[var(--jarvis-border-strong)] pl-3">
              <div className="mb-1 flex items-center gap-2 text-[9px] tracking-[0.2em] text-[var(--jarvis-text-faint)]">
                <span>USER COMMAND</span>
                <span>{formatTime(m.created_at)}</span>
              </div>
              <div className="hud-mono text-[13px] leading-relaxed text-[var(--jarvis-text-dim)]">
                "{m.message}"
              </div>
            </div>
          ) : (
            <div key={m.id} className="animate-fade-in border-l border-[var(--jarvis-border-accent)] pl-3">
              <div className="mb-1 flex items-center gap-2 text-[9px] tracking-[0.2em] text-[var(--jarvis-accent-bright)]">
                <span className="h-1 w-1 rounded-full bg-[var(--jarvis-accent)]" />
                <span>J.A.R.V.I.S.</span>
                <span className="text-[var(--jarvis-text-faint)]">{formatTime(m.created_at)}</span>
              </div>
              <div className="text-[15px] leading-relaxed text-[var(--jarvis-text)]">{m.message}</div>
            </div>
          )
        )}

        {status === "thinking" && (
          <div className="flex items-center gap-2 border-l border-[var(--jarvis-border-accent)] pl-3 text-[11px] tracking-widest text-[var(--jarvis-text-faint)] animate-fade-in">
            <span className="h-1.5 w-1.5 animate-pulse-fast rounded-full bg-[var(--jarvis-accent)]" />
            <span className="hud-mono text-[var(--jarvis-accent)]">COGNITIVE PROCESS</span>
            <span>{thinkingPhase}</span>
            <span className="animate-caret">...</span>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
