import type { AssistantStatus } from "../../types";

const STATUS_COLOR: Record<AssistantStatus, string> = {
  idle: "#2bb7ff",
  listening: "#7debff",
  processing: "#4da6ff",
  thinking: "#4debff",
  speaking: "#9ff2ff",
  error: "#ff5c5c",
  offline: "#4a545c",
};

/**
 * CSS-only stand-in for the WebGL AI core, used when three.js/WebGL is
 * unavailable. Mirrors the same state-driven behavior with plain CSS
 * animations so the HUD still communicates status.
 */
export function StaticCore({ status }: { status: AssistantStatus }) {
  const color = STATUS_COLOR[status];
  const spin = status === "thinking" || status === "processing";

  return (
    <div
      className="relative flex aspect-square w-full mx-auto items-center justify-center"
      style={{ maxWidth: "clamp(160px, 55vw, 440px)" }}
    >
      <div
        className={`absolute h-[70%] w-[70%] rounded-full border ${spin ? "animate-spin-slow" : ""}`}
        style={{ borderColor: color, opacity: 0.35 }}
      />
      <div
        className={`absolute h-[85%] w-[85%] rounded-full border ${spin ? "animate-spin-reverse" : ""}`}
        style={{ borderColor: color, opacity: 0.2 }}
      />
      <div
        className={`h-24 w-24 rounded-full ${status === "offline" ? "" : "animate-breathe"}`}
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          opacity: status === "offline" ? 0.25 : 0.9,
        }}
      />
    </div>
  );
}
