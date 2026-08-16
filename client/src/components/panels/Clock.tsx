import { useEffect, useState } from "react";

export function Clock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`hud-mono ${className}`}>
      <div className="text-[11px] tracking-[0.15em] text-[var(--jarvis-text-dim)]">
        {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-[9px] tracking-[0.2em] text-[var(--jarvis-text-faint)]">
        {now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
      </div>
    </div>
  );
}
