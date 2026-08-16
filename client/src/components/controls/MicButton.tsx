import type { AssistantStatus } from "../../types";

interface MicButtonProps {
  status: AssistantStatus;
  onToggle: () => void;
  disabled?: boolean;
}

export function MicButton({ status, onToggle, disabled }: MicButtonProps) {
  const listening = status === "listening";
  const busy = status === "processing" || status === "thinking" || status === "speaking";

  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-pressed={listening}
      aria-label={listening ? "Stop listening" : "Start voice command"}
      title={listening ? "Click to stop listening" : "Click to speak"}
      onClick={onToggle}
      className={`relative flex h-14 w-14 items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jarvis-accent)] disabled:cursor-not-allowed disabled:opacity-40 ${
        listening
          ? "border-[var(--jarvis-ok)] bg-[var(--jarvis-ok)]/10"
          : "border-[var(--jarvis-accent)] bg-[var(--jarvis-accent)]/10 hover:bg-[var(--jarvis-accent)]/20"
      }`}
    >
      {listening && (
        <span className="absolute inset-0 animate-pulse-fast rounded-full border border-[var(--jarvis-ok)]" />
      )}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={listening ? "var(--jarvis-ok)" : "var(--jarvis-accent)"}
        strokeWidth="1.8"
        aria-hidden
      >
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <path d="M12 17v4M8 21h8" />
      </svg>
    </button>
  );
}
