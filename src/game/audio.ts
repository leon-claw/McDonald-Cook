export type SoundName = 'pickup' | 'select' | 'cook' | 'success' | 'failure' | 'click';

let audioContext: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
const voices = new Set<OscillatorNode>();

/** Called from a user gesture. Browsers that block audio leave the game fully playable. */
export function initAudio(): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    if (!audioContext) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      audioContext = new Context();
      master = audioContext.createGain();
      master.gain.value = 0.18;
      master.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => undefined);
  } catch {
    // Audio is decoration; unavailable devices or autoplay policy must not interrupt gameplay.
  }
}

export function setAudioEnabled(value: boolean): void {
  enabled = value;
  if (master && audioContext) {
    master.gain.setTargetAtTime(value ? 0.18 : 0, audioContext.currentTime, 0.03);
  }
  if (!value) {
    for (const voice of voices) {
      try { voice.stop(); } catch { /* a finished voice may already be stopped */ }
    }
    voices.clear();
  }
}

function note(frequency: number, delay: number, duration: number, volume = 0.6, type: OscillatorType = 'triangle'): void {
  if (!audioContext || !master) return;
  const when = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, when);
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(volume, when + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  oscillator.connect(gain);
  gain.connect(master);
  voices.add(oscillator);
  oscillator.onended = () => {
    voices.delete(oscillator);
    oscillator.disconnect();
    gain.disconnect();
  };
  oscillator.start(when);
  oscillator.stop(when + duration + 0.015);
}

/** Original synthesized cues, with no downloaded music or game samples. */
export function playSound(name: SoundName): void {
  if (!enabled) return;
  initAudio();
  if (!audioContext || !master) return;
  try {
    switch (name) {
      case 'pickup':
        note(660, 0, 0.13, 0.4, 'sine');
        note(990, 0.07, 0.22, 0.3, 'sine');
        break;
      case 'select':
        note(540, 0, 0.09, 0.22);
        break;
      case 'click':
        note(360, 0, 0.06, 0.18);
        break;
      case 'cook': {
        // The syncopated phrase accompanies 5.6 seconds of bouncing ingredients.
        const melody = [392, 523.25, 440, 659.25, 587.33, 523.25, 783.99, 659.25, 880, 783.99, 1046.5];
        const beats = [0.2, 0.65, 1.1, 1.55, 1.95, 2.35, 2.7, 3.05, 3.35, 3.6, 3.85];
        melody.forEach((frequency, index) => {
          note(frequency, beats[index]!, 0.24, 0.3);
          note(index % 2 ? 146.83 : 130.81, beats[index]!, 0.14, 0.5, 'sine');
        });
        note(262, 4.3, 0.45, 0.23, 'sine');
        break;
      }
      case 'success':
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => note(frequency, index * 0.09, 0.7, 0.33));
        break;
      case 'failure':
        [311.13, 293.66, 196].forEach((frequency, index) => note(frequency, index * 0.16, 0.42, 0.35));
        break;
    }
  } catch {
    // Muting, device changes, or a suspended audio context must never reject a game action.
  }
}
