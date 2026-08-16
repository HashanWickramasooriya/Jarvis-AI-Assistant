import { useJarvisStore } from "../../state/store";
import type { AssistantStatus } from "../../types";

const TASK_LABEL: Record<AssistantStatus, string> = {
  idle: "AWAITING COMMAND",
  listening: "CAPTURING VOICE INPUT",
  processing: "TRANSCRIBING AUDIO",
  thinking: "GENERATING RESPONSE",
  speaking: "DELIVERING RESPONSE",
  error: "TASK INTERRUPTED",
  offline: "SYSTEM OFFLINE",
};

export function ContextPanel({ status }: { status: AssistantStatus }) {
  const messages = useJarvisStore((s) => s.messages);
  const serviceStatus = useJarvisStore((s) => s.serviceStatus);

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const memoryOnline = serviceStatus?.memory === "online";
  const ttsReady = serviceStatus?.tts === "ready";

  return (
    <div className="hud-panel relative rounded-sm p-4">
      <span className="hud-corner hud-corner-tl" />
      <span className="hud-corner hud-corner-br" />
      <h2 className="hud-panel-title mb-3">CONVERSATION CONTEXT</h2>

      <div className="mb-3">
        <div className="hud-label mb-1">CURRENT TASK</div>
        <div className="hud-mono text-[11px] text-[var(--jarvis-accent-bright)]">
          {TASK_LABEL[status]}
        </div>
      </div>

      <div className="mb-3">
        <div className="hud-label mb-1">LAST INPUT</div>
        <div className="truncate text-[11px] text-[var(--jarvis-text-dim)]" title={lastUser?.message}>
          {lastUser ? lastUser.message : "—"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[var(--jarvis-border)] pt-3 text-[11px]">
        <div className="hud-label">MEMORY</div>
        <div className={memoryOnline ? "text-[var(--jarvis-ok)]" : "text-[var(--jarvis-err)]"}>
          {memoryOnline ? "ONLINE" : "OFFLINE"}
        </div>
        <div className="hud-label">VOICE</div>
        <div className={ttsReady ? "text-[var(--jarvis-ok)]" : "text-[var(--jarvis-err)]"}>
          {ttsReady ? "READY" : "TEXT ONLY"}
        </div>
        <div className="hud-label">MESSAGES</div>
        <div className="hud-mono text-[var(--jarvis-text)]">{messages.length}</div>
      </div>
    </div>
  );
}
