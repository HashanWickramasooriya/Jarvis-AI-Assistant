import { useEffect, useRef } from "react";

interface WaveformProps {
  level: number;
  active: boolean;
}

const BAR_COUNT = 28;

export function Waveform({ level, active }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0.05));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const bars = barsRef.current;
      const barWidth = width / BAR_COUNT;
      ctx.fillStyle = "#4debff";
      for (let i = 0; i < BAR_COUNT; i++) {
        const h = Math.max(2, bars[i] * height);
        ctx.globalAlpha = 0.35 + bars[i] * 0.65;
        ctx.fillRect(i * barWidth + 1, (height - h) / 2, barWidth - 2, h);
      }
      ctx.globalAlpha = 1;
    };

    if (!active) {
      barsRef.current = barsRef.current.map((b) => b * 0.5 + 0.02);
      render();
      return;
    }

    let frame: number;
    const tick = () => {
      const bars = barsRef.current;
      for (let i = 0; i < BAR_COUNT; i++) {
        const target = Math.min(1, level * (0.6 + Math.random() * 0.8));
        bars[i] += (target - bars[i]) * 0.25;
      }
      render();
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [active, level]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={40}
      className="w-full max-w-70"
      role="img"
      aria-label={active ? "Audio waveform, active" : "Audio waveform, idle"}
    />
  );
}
