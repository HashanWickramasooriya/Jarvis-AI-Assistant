import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export interface MicLevelHandle {
  level: number;
  /** Highest amplitude observed since the last resetPeak() call — used to
   * detect whether a recording captured any real speech energy at all,
   * independent of (and more reliable than) Whisper's own confidence
   * scoring, which does not reliably flag hallucinated output on silence. */
  peakRef: RefObject<number>;
  resetPeak: () => void;
}

/**
 * Tracks a 0..1 amplitude level from a live MediaStream (mic input), for
 * driving reactive HUD visuals. The analysis loop only runs while a stream
 * is attached, so it never spins when idle.
 */
export function useMicLevel(stream: MediaStream | null): MicLevelHandle {
  const [level, setLevel] = useState(0);
  const peakRef = useRef(0);
  const resetPeak = () => {
    peakRef.current = 0;
  };

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      return;
    }

    const AudioCtx =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const sourceNode = ctx.createMediaStreamSource(stream);
    sourceNode.connect(analyser);

    let frame: number;
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
      const normalized = Math.min(1, avg / 128);
      setLevel(normalized);
      if (normalized > peakRef.current) peakRef.current = normalized;
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      sourceNode.disconnect();
      analyser.disconnect();
      ctx.close().catch(() => {});
      setLevel(0);
    };
  }, [stream]);

  return { level, peakRef, resetPeak };
}

export interface TtsLevelHandle {
  level: number;
  /**
   * Resumes the shared AudioContext if it's suspended, and resolves once
   * that's settled (or immediately if there's no graph yet). MUST be
   * awaited before calling audioEl.play() — see the note below.
   */
  ensureResumed: () => Promise<void>;
}

/**
 * Tracks a 0..1 amplitude level for a single, persistent HTMLAudioElement
 * used for TTS playback. The Web Audio API only allows a MediaElementSource
 * to be created once per element for its lifetime, so the analyser graph is
 * built lazily on first use and reused thereafter — only the RAF polling
 * loop starts/stops with `active`.
 *
 * Important: once createMediaElementSource(audioEl) runs, ALL of that
 * element's audio output is rerouted through this Web Audio graph — it no
 * longer plays directly. That graph only produces audible output while its
 * AudioContext is "running"; a fresh AudioContext always starts
 * "suspended" until resumed. Resuming was previously done reactively in a
 * separate effect keyed off `active`, racing independently against
 * audioEl.play() in useAssistant's speak() — play() can resolve
 * successfully (no error, no rejection) while the context is still
 * suspended, producing silent "playback" with no visible failure. Exposing
 * ensureResumed() lets the caller await the resume in the same sequence as
 * play(), closing that race.
 */
export function useTtsLevel(audioEl: HTMLAudioElement | null, active: boolean): TtsLevelHandle {
  const [level, setLevel] = useState(0);
  const graphRef = useRef<{ ctx: AudioContext; analyser: AnalyserNode } | null>(null);

  useEffect(() => {
    if (!audioEl) return;
    if (!graphRef.current) {
      const AudioCtx =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const sourceNode = ctx.createMediaElementSource(audioEl);
      sourceNode.connect(analyser);
      analyser.connect(ctx.destination);
      graphRef.current = { ctx, analyser };
    }
  }, [audioEl]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!active || !graph) {
      setLevel(0);
      return;
    }
    if (graph.ctx.state === "suspended") graph.ctx.resume().catch(() => {});
    const data = new Uint8Array(graph.analyser.frequencyBinCount);
    let frame: number;
    const tick = () => {
      graph.analyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
      setLevel(Math.min(1, avg / 128));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [active]);

  const ensureResumed = useCallback(async () => {
    const graph = graphRef.current;
    if (!graph) return;
    if (graph.ctx.state === "suspended") {
      await graph.ctx.resume().catch(() => {});
    }
  }, []);

  return { level, ensureResumed };
}
