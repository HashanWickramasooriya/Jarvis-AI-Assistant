import { useRef, useState } from "react";
import { CoreFrame } from "./components/core/CoreFrame";
import { StatusPanel } from "./components/panels/StatusPanel";
import { StatusStrip } from "./components/panels/StatusStrip";
import { ContextPanel } from "./components/panels/ContextPanel";
import { ConversationPanel } from "./components/panels/ConversationPanel";
import { MemoryPanel } from "./components/panels/MemoryPanel";
import { SettingsPanel } from "./components/panels/SettingsPanel";
import { DiagnosticsPanel } from "./components/panels/DiagnosticsPanel";
import { AuxPanel } from "./components/panels/AuxPanel";
import { Clock } from "./components/panels/Clock";
import { MicButton } from "./components/controls/MicButton";
import { ChatInput } from "./components/controls/ChatInput";
import type { ChatInputHandle } from "./components/controls/ChatInput";
import { Waveform } from "./components/controls/Waveform";
import { MobileMenu } from "./components/controls/MobileMenu";
import { useAssistant } from "./hooks/useAssistant";
import { useServiceStatus } from "./hooks/useServiceStatus";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useJarvisStore } from "./state/store";

function App() {
  useServiceStatus();
  const assistant = useAssistant();
  const memoryPanelOpen = useJarvisStore((s) => s.memoryPanelOpen);
  const toggleMemoryPanel = useJarvisStore((s) => s.toggleMemoryPanel);
  const statusMessage = useJarvisStore((s) => s.statusMessage);
  const serviceStatus = useJarvisStore((s) => s.serviceStatus);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const chatInputRef = useRef<ChatInputHandle>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isWide = useMediaQuery("(min-width: 1280px)");

  const busy =
    assistant.status === "processing" ||
    assistant.status === "thinking" ||
    assistant.status === "speaking";
  // The mic button alone stays enabled while JARVIS is speaking, so a
  // click can interrupt (barge-in) — see MicButton/useAssistant. Typed
  // input stays gated by the full `busy` as before.
  const micBusy = assistant.status === "processing" || assistant.status === "thinking";

  const backendDown = serviceStatus !== null && serviceStatus.network === "offline";
  const displayStatus = backendDown && assistant.status === "idle" ? "offline" : assistant.status;

  const micControls = (
    <div className="flex w-full max-w-lg items-center gap-3">
      <MicButton status={assistant.status} onToggle={assistant.toggleListening} disabled={micBusy} />
      <ChatInput ref={chatInputRef} onSubmit={assistant.submitText} disabled={busy} />
    </div>
  );

  const voiceRow = (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <label className="flex items-center gap-2 text-[10px] tracking-widest text-[var(--jarvis-text-faint)]">
        <input
          type="checkbox"
          checked={assistant.voiceMode}
          onChange={(e) => assistant.setVoiceMode(e.target.checked)}
          className="accent-[var(--jarvis-accent)]"
        />
        VOICE RESPONSES
      </label>
      {assistant.pendingAudioUrl && (
        <button
          onClick={assistant.enableVoicePlayback}
          className="rounded-sm border border-[var(--jarvis-accent)] px-2 py-1 text-[10px] tracking-widest text-[var(--jarvis-accent)] hover:bg-[var(--jarvis-accent)]/10 focus-visible:outline-2 focus-visible:outline-[var(--jarvis-accent)]"
        >
          CLICK TO ENABLE VOICE
        </button>
      )}
    </div>
  );

  const alerts = (
    <>
      {assistant.status === "error" && statusMessage && (
        <p role="alert" className="max-w-sm text-center text-xs text-[var(--jarvis-err)]">
          {statusMessage}
        </p>
      )}
      {assistant.micError && (
        <p role="alert" className="max-w-sm text-center text-xs text-[var(--jarvis-err)]">
          {assistant.micError}
        </p>
      )}
    </>
  );

  return (
    <div className="safe-x flex min-h-dvh w-screen flex-col bg-[var(--jarvis-bg)] lg:h-dvh lg:overflow-hidden">
      <header className="safe-top flex shrink-0 items-center justify-between border-b border-[var(--jarvis-border)] px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold tracking-[0.3em] text-[var(--jarvis-text)] sm:text-sm sm:tracking-[0.35em]">
            JARVIS
          </span>
          <span className="hidden text-[10px] tracking-widest text-[var(--jarvis-text-faint)] sm:inline">
            PERSONAL AI SYSTEM
          </span>
        </div>

        {isDesktop ? (
          <div className="flex items-center gap-5">
            <Clock className="hidden text-right md:block" />
            <nav className="flex items-center gap-1 text-[10px] tracking-widest" aria-label="Primary">
              <button
                onClick={toggleMemoryPanel}
                aria-pressed={memoryPanelOpen}
                className="min-h-11 rounded-sm px-2.5 py-1.5 text-[var(--jarvis-text-dim)] hover:text-[var(--jarvis-text)] focus-visible:outline-2 focus-visible:outline-[var(--jarvis-accent)]"
              >
                MEMORY
              </button>
              <button
                onClick={() => chatInputRef.current?.focus()}
                className="min-h-11 rounded-sm px-2.5 py-1.5 text-[var(--jarvis-text-dim)] hover:text-[var(--jarvis-text)] focus-visible:outline-2 focus-visible:outline-[var(--jarvis-accent)]"
              >
                COMMANDS
              </button>
              <button
                onClick={() => setDiagnosticsOpen(true)}
                className="min-h-11 rounded-sm px-2.5 py-1.5 text-[var(--jarvis-text-dim)] hover:text-[var(--jarvis-text)] focus-visible:outline-2 focus-visible:outline-[var(--jarvis-accent)]"
              >
                DIAGNOSTICS
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                aria-label="Settings"
                title="Settings"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-sm text-[var(--jarvis-text-dim)] hover:text-[var(--jarvis-text)] focus-visible:outline-2 focus-visible:outline-[var(--jarvis-accent)]"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </nav>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                serviceStatus?.ai === "online" ? "bg-[var(--jarvis-ok)]" : "bg-[var(--jarvis-err)]"
              }`}
            />
            <MobileMenu
              onMemory={toggleMemoryPanel}
              onDiagnostics={() => setDiagnosticsOpen(true)}
              onSettings={() => setSettingsOpen(true)}
            />
          </div>
        )}
      </header>

      {isDesktop ? (
        <main
          className={`grid flex-1 grid-cols-[240px_1fr] gap-4 overflow-hidden p-4 sm:p-6 ${
            isWide ? "xl:grid-cols-[240px_1fr_340px]" : ""
          }`}
        >
          <aside className="flex flex-col gap-4">
            <StatusPanel />
            <AuxPanel />
          </aside>

          <section className="flex flex-col items-center justify-center gap-5 overflow-hidden">
            <CoreFrame status={displayStatus} level={assistant.level} statusMessage={statusMessage} />
            <Waveform
              level={assistant.level}
              active={assistant.status === "listening" || assistant.status === "speaking"}
            />
            {alerts}
            {micControls}
            {voiceRow}
            <Clock className="text-center md:hidden" />
          </section>

          {isWide && (
            <aside className="flex flex-col gap-4 overflow-hidden">
              <ContextPanel status={displayStatus} />
              <div className="min-h-0 flex-1">
                <ConversationPanel status={assistant.status} />
              </div>
            </aside>
          )}
        </main>
      ) : (
        <main className="safe-bottom flex flex-1 flex-col gap-2.5 p-2.5">
          <StatusStrip />

          <div className="flex shrink-0 flex-col items-center gap-2">
            <CoreFrame status={displayStatus} level={assistant.level} statusMessage={statusMessage} />
            <Waveform
              level={assistant.level}
              active={assistant.status === "listening" || assistant.status === "speaking"}
            />
            {alerts}
          </div>

          <div className="min-h-0 flex-1">
            <ConversationPanel status={assistant.status} />
          </div>

          <div className="flex shrink-0 flex-col items-center gap-2.5">
            {micControls}
            {voiceRow}
          </div>
        </main>
      )}

      <MemoryPanel open={memoryPanelOpen} onClose={toggleMemoryPanel} />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        voiceMode={assistant.voiceMode}
        setVoiceMode={assistant.setVoiceMode}
      />
      <DiagnosticsPanel
        open={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        level={assistant.level}
      />
    </div>
  );
}

export default App;
