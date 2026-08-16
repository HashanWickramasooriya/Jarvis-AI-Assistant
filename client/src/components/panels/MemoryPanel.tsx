import { useEffect, useMemo, useState } from "react";
import { useJarvisStore } from "../../state/store";
import { clearAllMemories, deleteMemory, fetchMemories } from "../../lib/api";

interface MemoryPanelProps {
  open: boolean;
  onClose: () => void;
}

export function MemoryPanel({ open, onClose }: MemoryPanelProps) {
  const memories = useJarvisStore((s) => s.memories);
  const setMemories = useJarvisStore((s) => s.setMemories);
  const serviceStatus = useJarvisStore((s) => s.serviceStatus);
  const [error, setError] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const memoryOnline = serviceStatus?.memory === "online";

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    fetchMemories()
      .then(setMemories)
      .catch((err) => setError(err instanceof Error ? err.message : "Cloud memory is unavailable."))
      .finally(() => setLoading(false));
  }, [open, setMemories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return memories;
    return memories.filter(
      (m) =>
        m.key.toLowerCase().includes(q) ||
        m.value.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [memories, query]);

  const grouped = filtered.reduce<Record<string, typeof memories>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  if (!open) return null;

  const handleForget = async (id: string) => {
    try {
      await deleteMemory(id);
      setMemories(memories.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete memory.");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllMemories();
      setMemories([]);
      setConfirmClearAll(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear memories.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Memory core panel"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="hud-panel relative flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="hud-corner hud-corner-tl" />
        <span className="hud-corner hud-corner-br" />

        <div className="flex items-center justify-between border-b border-[var(--jarvis-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="hud-panel-title">MEMORY CORE</h2>
            <span
              className={`hud-mono flex items-center gap-1 text-[9px] ${
                memoryOnline ? "text-[var(--jarvis-ok)]" : "text-[var(--jarvis-err)]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${memoryOnline ? "bg-[var(--jarvis-ok)]" : "bg-[var(--jarvis-err)]"}`} />
              {memoryOnline ? "CLOUD CONNECTED" : "CLOUD OFFLINE"}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close memory panel"
            className="text-xs text-[var(--jarvis-text-dim)] hover:text-[var(--jarvis-text)] focus-visible:outline-2 focus-visible:outline-[var(--jarvis-accent)]"
          >
            CLOSE
          </button>
        </div>

        <div className="border-b border-[var(--jarvis-border)] px-4 py-2.5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memory..."
            aria-label="Search stored memories"
            disabled={!memoryOnline || memories.length === 0}
            className="w-full rounded-sm border border-[var(--jarvis-border)] bg-[var(--jarvis-metal)] px-3 py-1.5 text-xs text-[var(--jarvis-text)] outline-none placeholder:text-[var(--jarvis-text-faint)] focus-visible:border-[var(--jarvis-accent)] disabled:opacity-40"
          />
        </div>

        <div className="hud-scrollbar flex-1 overflow-y-auto px-4 py-4">
          {error && <p className="mb-3 text-xs text-[var(--jarvis-err)]">{error}</p>}
          {loading && <p className="text-xs text-[var(--jarvis-text-faint)]">Querying memory core...</p>}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-sm text-[var(--jarvis-text-faint)]">
              {memories.length === 0 ? "No memories stored yet." : "No memories match your search."}
            </p>
          )}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-4">
              <h3 className="hud-label mb-2 text-[var(--jarvis-accent-bright)]">{category.toUpperCase()}</h3>
              <ul className="space-y-2">
                {items.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-sm border border-[var(--jarvis-border)] bg-[var(--jarvis-metal)] px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="text-[var(--jarvis-text-faint)]">{m.key}: </span>
                      <span className="text-[var(--jarvis-text)]">{m.value}</span>
                    </div>
                    <button
                      onClick={() => handleForget(m.id)}
                      className="shrink-0 text-[10px] tracking-widest text-[var(--jarvis-text-faint)] hover:text-[var(--jarvis-err)] focus-visible:outline-2 focus-visible:outline-[var(--jarvis-accent)]"
                    >
                      FORGET
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--jarvis-border)] px-4 py-3">
          {confirmClearAll ? (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[var(--jarvis-text-dim)]">Clear all memories? This cannot be undone.</span>
              <div className="flex gap-2">
                <button
                  onClick={handleClearAll}
                  className="rounded-sm border border-[var(--jarvis-err)] px-2 py-1 text-[var(--jarvis-err)]"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmClearAll(false)}
                  className="rounded-sm border border-[var(--jarvis-border)] px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClearAll(true)}
              disabled={memories.length === 0}
              className="text-[10px] tracking-widest text-[var(--jarvis-text-faint)] hover:text-[var(--jarvis-err)] disabled:opacity-30"
            >
              CLEAR ALL MEMORIES
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
