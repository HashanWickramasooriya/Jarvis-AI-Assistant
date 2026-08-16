import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { FormEvent } from "react";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export interface ChatInputHandle {
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  { onSubmit, disabled },
  ref
) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit(value);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2">
      <label htmlFor="jarvis-chat-input" className="sr-only">
        Message J.A.R.V.I.S.
      </label>
      <input
        ref={inputRef}
        id="jarvis-chat-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Message J.A.R.V.I.S..."
        className="flex-1 rounded-sm border border-[var(--jarvis-border)] bg-[var(--jarvis-metal)] px-4 py-3 text-sm text-[var(--jarvis-text)] outline-none placeholder:text-[var(--jarvis-text-faint)] focus-visible:border-[var(--jarvis-accent)] disabled:opacity-40"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-sm border border-[var(--jarvis-accent)] bg-[var(--jarvis-accent)]/10 px-4 py-3 text-xs font-semibold tracking-widest text-[var(--jarvis-accent)] transition-colors hover:bg-[var(--jarvis-accent)]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jarvis-accent)] disabled:cursor-not-allowed disabled:opacity-30"
      >
        SEND
      </button>
    </form>
  );
});
