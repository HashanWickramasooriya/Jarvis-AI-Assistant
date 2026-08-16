/**
 * A short, clean startup chime, synthesized with the Web Audio API rather
 * than shipped as a binary asset — no file to license/attribute, zero
 * bundle-size cost, no network/API request just to make a sound. Uses its
 * own short-lived AudioContext, entirely separate from the persistent
 * <audio> element + AudioContext the TTS pipeline owns (useAudioLevel.ts /
 * useAssistant.ts) — the two audio paths never touch, so this can never
 * interfere with TTS playback or its AudioContext-resume sequencing.
 *
 * Two soft ascending sine tones with a gentle envelope — deliberately
 * restrained (quiet, sub-second, no percussion/noise) to read as "premium
 * assistant initialization" rather than a game/notification sound.
 */
export function playStartupChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.16; // subtle — not loud, not annoying
    master.connect(ctx.destination);

    const tone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(1, now + start + 0.04); // soft attack
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration); // smooth decay
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    };

    tone(523.25, 0, 0.32); // C5
    tone(783.99, 0.14, 0.4); // G5 — gentle ascending interval

    // Release the context once the tail has finished; nothing keeps it
    // alive otherwise, and dangling AudioContexts warn in some browsers.
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    // Never let a decorative sound break app startup.
  }
}
