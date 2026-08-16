import { useState } from "react";
import { useJarvisStore } from "../../state/store";
import { clearConversation as apiClearConversation } from "../../lib/api";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  voiceMode: boolean;
  setVoiceMode: (v: boolean) => void;
}

export function SettingsPanel({ open, onClose, voiceMode, setVoiceMode }: SettingsPanelProps) {
  const sessionId = useJarvisStore((s) => s.sessionId);
  const serviceStatus = useJarvisStore((s) => s.serviceStatus);
  const clearMessages = useJarvisStore((s) => s.clearMessages);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleClearConversation = async () => {
    try {
      await apiClearConversation(sessionId);
      clearMessages();
      setConfirmClear(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear conversation.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings panel"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="hud-panel relative w-full max-w-md overflow-hidden rounded-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="hud-corner hud-corner-tl" />
        <span className="hud-corner hud-corner-br" />

        <div className="flex items-center justify-between border-b border-[var(--jarvis-border)] px-4 py-3">
          <h2 className="hud-panel-title">SETTINGS</h2>
          <button
            onClick={onClose}
            aria-label="Close settings panel"
            className="text-xs text-[var(--jarvis-text-dim)] hover:text-[var(--jarvis-text)] focus-visible:outline-2 focus-visible:outline-[var(--jarvis-accent)]"
          >
            CLOSE
          </button>
        </div>

        <div className="space-y-5 px-4 py-4">
          <label className="flex items-center justify-between text-xs">
            <span className="hud-label">VOICE RESPONSES (TTS)</span>
            <input
              type="checkbox"
              checked={voiceMode}
              onChange={(e) => setVoiceMode(e.target.checked)}
              className="accent-[var(--jarvis-accent)]"
            />
          </label>

          <div className="grid grid-cols-2 gap-y-2 text-[11px]">
            <span className="hud-label">COGNITIVE CORE</span>
            <span className="hud-mono text-right text-[var(--jarvis-text)]">
              {serviceStatus?.ai === "online" ? "ACTIVE" : "OFFLINE"}
            </span>
            <span className="hud-label">VOICE OUTPUT</span>
            <span className="hud-mono text-right text-[var(--jarvis-text)]">
              {serviceStatus?.tts === "ready" ? "READY" : "UNAVAILABLE"}
            </span>
            <span className="hud-label">SESSION ID</span>
            <span className="hud-mono truncate text-right text-[var(--jarvis-text-faint)]">
              {sessionId.slice(0, 8)}
            </span>
          </div>

          {error && <p className="text-xs text-[var(--jarvis-err)]">{error}</p>}

          <div className="border-t border-[var(--jarvis-border)] pt-4">
            {confirmClear ? (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-[var(--jarvis-text-dim)]">Clear this conversation?</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearConversation}
                    className="rounded-sm border border-[var(--jarvis-err)] px-2 py-1 text-[var(--jarvis-err)]"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="rounded-sm border border-[var(--jarvis-border)] px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="text-[10px] tracking-widest text-[var(--jarvis-text-dim)] hover:text-[var(--jarvis-err)]"
              >
                CLEAR CONVERSATION
              </button>
            )}
          </div>

          <div className="border-t border-[var(--jarvis-border)] pt-4 text-center">
            <div className="hud-label mb-1">J.A.R.V.I.S. — PERSONAL AI SYSTEM</div>
            <div className="text-[10px] text-[var(--jarvis-text-faint)]">
              Designed &amp; developed by{" "}
              <a
                href="https://hashanjanithwickramasooriya.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--jarvis-accent)] hover:underline"
              >
                Hashan Janith Wickramasooriya
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
