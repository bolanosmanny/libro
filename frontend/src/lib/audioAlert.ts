// Synthesizes a pleasant library-appropriate chime using the browser's Web Audio API.
// No external audio files or network requests needed.

class AudioManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("libro_timer_sound_enabled");
      if (stored !== null) {
        this.soundEnabled = stored === "true";
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("libro_timer_sound_enabled", String(enabled));
    }
  }

  // Play a soft, pleasant 3-tone chime (E5 -> G#5 -> B5)
  public playCompletionChime() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const notes = [659.25, 830.61, 987.77]; // E5, G#5, B5 (pleasant major chord)
      const startTime = ctx.currentTime;

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime + index * 0.18);

        gain.gain.setValueAtTime(0.001, startTime + index * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.25, startTime + index * 0.18 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + index * 0.18 + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime + index * 0.18);
        osc.stop(startTime + index * 0.18 + 0.75);
      });
    } catch (e) {
      console.warn("Web Audio API chime could not play:", e);
    }
  }

  // Soft single chime for small actions or testing
  public playTestChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch (e) {
      console.warn("Web Audio API test chime failed:", e);
    }
  }
}

export const audioManager = new AudioManager();

