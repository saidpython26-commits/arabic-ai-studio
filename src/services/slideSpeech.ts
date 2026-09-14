// Voice explanation and sound synthesizer for interactive slides presentations

class SlideSpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // Play PowerPoint-like transition & reveal sound effects using Web Audio API
  public playSoundEffect(type: 'slide-transition' | 'bullet-appear' | 'tada' | 'click' | 'whoosh') {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'slide-transition') {
        // Smooth whoosh chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.18);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'bullet-appear') {
        // Crisp pop / snap
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'whoosh') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'tada') {
        // Success chord
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.value = freq;
          const startTime = now + idx * 0.06;
          g.gain.setValueAtTime(0.05, startTime);
          g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
          o.start(startTime);
          o.stop(startTime + 0.35);
        });
      } else {
        // Quick click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch {
      // Audio context might be restricted before first click
    }
  }

  // Find best Arabic/English voice available on the device
  private findBestVoice(lang = 'ar'): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return null;

    if (lang === 'ar') {
      // Priority for natural Arabic voices (Google, Microsoft, Apple Maged/Tarik)
      const arVoices = voices.filter((v) => v.lang.startsWith('ar') || v.lang.includes('AR'));
      if (arVoices.length > 0) {
        const preferred = arVoices.find(
          (v) =>
            v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Salma') ||
            v.name.includes('Shakir') ||
            v.name.includes('Maged') ||
            v.name.includes('Tariq')
        );
        return preferred || arVoices[0];
      }
    }

    // Default or English fallback
    const enVoices = voices.filter((v) => v.lang.startsWith('en'));
    return enVoices[0] || voices[0] || null;
  }

  // Speak slide explanation aloud
  public speakSlide(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      lang?: string;
      onEnd?: () => void;
      onBoundary?: (charIndex: number) => void;
    }
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || !text.trim()) {
        resolve();
        return;
      }

      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.lang || 'ar-SA';
      utterance.rate = options?.rate || 0.95; // Clear natural pace
      utterance.pitch = options?.pitch || 1.0;

      const voice = this.findBestVoice(options?.lang?.startsWith('en') ? 'en' : 'ar');
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (options?.onEnd) options.onEnd();
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        resolve();
      };

      this.currentUtterance = utterance;
      this.isSpeaking = true;
      this.synth.speak(utterance);
    });
  }

  public stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // ignore
      }
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const slideSpeechService = new SlideSpeechService();
