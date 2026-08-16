import { useEffect, useRef, useState } from "react";

interface MobileMenuProps {
  onMemory: () => void;
  onDiagnostics: () => void;
  onSettings: () => void;
}

/**
 * Collapses the secondary navigation actions (memory / diagnostics /
 * settings) into a single menu button on narrow screens, so the header
 * never has to scroll or clip at 320px width.
 */
export function MobileMenu({ onMemory, onDiagnostics, onSettings }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const item = (label: string, onClick: () => void) => (
    <button
      role="menuitem"
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className="w-full min-h-11 rounded-sm px-3 py-2.5 text-left text-[11px] tracking-widest text-[var(--jarvis-text-dim)] hover:bg-[var(--jarvis-metal)] hover:text-[var(--jarvis-text)] focus-visible:outline-2 focus-visible:outline-[var(--jarvis-accent)]"
    >
      {label}
    </button>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        aria-expanded={open}
        title="Menu"
        className="flex h-11 w-11 items-center justify-center rounded-sm text-[var(--jarvis-text-dim)] hover:text-[var(--jarvis-text)] focus-visible:outline-2 focus-visible:outline-[var(--jarvis-accent)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="hud-panel absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-sm py-1"
        >
          {item("MEMORY", onMemory)}
          {item("DIAGNOSTICS", onDiagnostics)}
          {item("SETTINGS", onSettings)}
        </div>
      )}
    </div>
  );
}
