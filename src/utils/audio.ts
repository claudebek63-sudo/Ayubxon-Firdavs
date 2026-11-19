let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playFeedbackTone(type: 'correct' | 'wrong' | 'click' | 'win', enabled = true): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const scheduleNote = (freq: number, startOffset: number, duration: number, gainPeak = 0.08, wave: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(gainPeak, now + startOffset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    if (type === 'click') {
      scheduleNote(520, 0, 0.06, 0.04, 'triangle');
    } else if (type === 'correct') {
      scheduleNote(523.25, 0, 0.14, 0.07, 'sine');
      scheduleNote(659.25, 0.08, 0.2, 0.07, 'sine');
    } else if (type === 'wrong') {
      scheduleNote(220, 0, 0.15, 0.06, 'triangle');
      scheduleNote(175, 0.09, 0.2, 0.06, 'triangle');
    } else if (type === 'win') {
      scheduleNote(523.25, 0, 0.14, 0.07, 'sine');
      scheduleNote(659.25, 0.09, 0.14, 0.07, 'sine');
      scheduleNote(783.99, 0.18, 0.16, 0.07, 'sine');
      scheduleNote(1046.5, 0.28, 0.28, 0.08, 'sine');
    }
  } catch {
    // Ignore audio context restriction errors gracefully
  }
}

export function speakRussian(text: string, rate = 0.9): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = rate;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const ruVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith('ru')) ||
      voices.find((v) => v.name.toLowerCase().includes('russian'));
    if (ruVoice) {
      utterance.voice = ruVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
