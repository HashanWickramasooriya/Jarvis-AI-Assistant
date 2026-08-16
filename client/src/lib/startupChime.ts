export interface BootAudio {
  /** Low tone rising to mid tone — played once, at the very start. */
  playOpening: () => void;
  /** A single soft, short blip — played at each system's "online" beat. */
  playTick: () => void;
  /** A brief ascending three-note confirmation — played once, at final ONLINE. */
  playConfirmation: () => void;
  /** Releases the shared AudioContext. Safe to call more than once. */
  dispose: () => void;
}

const NOOP_BOOT_AUDIO: BootAudio = {
  playOpening: () => {},
  playTick: () => {},
  playConfirmation: () => {},
  dispose: () => {},
};

/**
 * Synthesizes the boot sequence's sound cues with the Web Audio API rather
 * than shipping a binary asset — no file to license/attribute, zero
 * bundle-size cost, no network/API request just to make a sound. One
 * AudioContext is shared across the whole boot sequence and explicitly
 * disposed when it ends, entirely separate from the persistent <audio>
 * element + AudioContext the TTS pipeline owns (useAudioLevel.ts /
 * useAssistant.ts) — the two audio paths never touch, so this can never
 * interfere with TTS playback or its AudioContext-resume sequencing.
 *
 * Every individual tone is short (well under half a second) and quiet —
 * this is a handful of sparse cues spread across ~8s, not a soundtrack.
 */
export function createBootAudio(): BootAudio {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return NOOP_BOOT_AUDIO;

    const ctx = new AudioCtx();
    let disposed = false;

    const tone = (freq: number, startOffset: number, duration: number, peakGain: number) => {
      if (disposed) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + startOffset);
      gain.gain.linearRampToValueAtTime(peakGain, now + startOffset + 0.04); // soft attack
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration); // smooth decay
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    return {
      playOpening: () => {
        // Low tone rising into a mid tone — the "power coming on" beat.
        tone(220, 0, 0.5, 0.14); // A3
        tone(329.63, 0.22, 0.55, 0.13); // E4
      },
      playTick: () => {
        // One quiet, short blip per system reaching its "online" state.
        tone(659.25, 0, 0.16, 0.07); // E5
      },
      playConfirmation: () => {
        // Brief ascending arpeggio — the final "all clear" cue.
        tone(523.25, 0, 0.3, 0.12); // C5
        tone(659.25, 0.09, 0.32, 0.12); // E5
        tone(783.99, 0.18, 0.4, 0.13); // G5
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        ctx.close().catch(() => {});
      },
    };
  } catch {
    // Never let a decorative sound break app startup.
    return NOOP_BOOT_AUDIO;
  }
}
