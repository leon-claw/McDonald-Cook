export type SoundName = 'pickup' | 'select' | 'hold' | 'cook' | 'success' | 'discovery' | 'failure' | 'click';
type Channel = 'ui' | 'pickup' | 'voice' | 'cooking' | 'result';
type Voice = { source: AudioScheduledSourceNode; gain: GainNode; channel: Channel };

// Static URLs let Vite serve the original local files and bundle only the selected samples.
const samples = {
  pickup: new URL('../../resource/sound/selected/SYS_ItemGet_Common.wav', import.meta.url).href,
  cook: new URL('../../resource/sound/selected/BGM_CookingSuccess.wav', import.meta.url).href,
  success: new URL('../../resource/sound/selected/Event_Cook_Success.wav', import.meta.url).href,
  laugh: [
    new URL('../../resource/sound/selected/PV618_00.wav', import.meta.url).href,
    new URL('../../resource/sound/selected/PV618_02.wav', import.meta.url).href,
  ],
  failure: new URL('../../resource/sound/botw_link/BOTW_Link_LoseBalance.wav', import.meta.url).href,
  lift: [
    new URL('../../resource/sound/botw_link/BOTW_Link_Lift1.wav', import.meta.url).href,
    new URL('../../resource/sound/botw_link/BOTW_Link_Lift2.wav', import.meta.url).href,
    new URL('../../resource/sound/botw_link/BOTW_Link_Lift3.wav', import.meta.url).href,
    new URL('../../resource/sound/botw_link/BOTW_Link_Lift4.wav', import.meta.url).href,
    new URL('../../resource/sound/botw_link/BOTW_Link_Lift5.wav', import.meta.url).href,
    new URL('../../resource/sound/botw_link/BOTW_Link_Lift6.wav', import.meta.url).href,
    new URL('../../resource/sound/botw_link/BOTW_Link_Lift7.wav', import.meta.url).href,
    new URL('../../resource/sound/botw_link/BOTW_Link_Lift8.wav', import.meta.url).href,
    new URL('../../resource/sound/botw_link/BOTW_Link_Lift9.wav', import.meta.url).href,
  ],
  throw: [
    new URL('../../resource/sound/botw_link/BOTW_Link_Throw1.wav', import.meta.url).href,
    new URL('../../resource/sound/botw_link/BOTW_Link_Throw2.wav', import.meta.url).href,
    new URL('../../resource/sound/botw_link/BOTW_Link_Throw3.wav', import.meta.url).href,
    new URL('../../resource/sound/botw_link/BOTW_Link_Throw4.wav', import.meta.url).href,
    new URL('../../resource/sound/botw_link/BOTW_Link_Throw5.wav', import.meta.url).href,
  ],
};

let audioContext: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let preloaded = false;
const voices = new Set<Voice>();
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const revisions: Record<Channel, number> = { ui: 0, pickup: 0, voice: 0, cooking: 0, result: 0 };
const lastVariant = new Map<readonly string[], number>();

// Ambient music runs on its own looping layer outside the SFX channel system,
// so gameplay stop()/stopAllSounds() calls never cut the music.
const bgmTrack = new URL('../../resource/sound/selected/BGM_TheGreatPlateau.mp3', import.meta.url).href;
const BGM_VOLUME = 0.5;
const BGM_FADE_SECONDS = 0.6;
let bgmHidden = false;
let bgmSource: AudioBufferSourceNode | null = null;
let bgmGain: GainNode | null = null;
let bgmPending: Promise<void> | null = null;

function loadSample(url: string): Promise<AudioBuffer | null> {
  const context = audioContext;
  if (!context) return Promise.resolve(null);
  const cached = buffers.get(url);
  if (cached) return cached;
  const pending = fetch(url)
    .then(response => {
      if (!response.ok) throw new Error('Audio sample unavailable');
      return response.arrayBuffer();
    })
    .then(bytes => context.decodeAudioData(bytes))
    .catch(() => { buffers.delete(url); return null; });
  buffers.set(url, pending);
  return pending;
}

/** Call from a user gesture to unlock playback and prepare the small set of used samples. */
export function initAudio(): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    if (!audioContext) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      audioContext = new Context();
      master = audioContext.createGain();
      master.gain.value = 0.42;
      master.connect(audioContext.destination);
      document.addEventListener('visibilitychange', () => {
        bgmHidden = document.hidden;
        if (document.hidden) stopAllSounds();
        syncBgm();
      });
      window.addEventListener('pagehide', stopAllSounds);
    }
    if (audioContext.state === 'suspended') {
      void audioContext.resume().then(() => syncBgm()).catch(() => undefined);
    }
    if (!preloaded) {
      preloaded = true;
      Object.values(samples).flat().forEach(url => { void loadSample(url); });
    }
    syncBgm();
  } catch {
    // Audio-device and autoplay failures must never interrupt gameplay.
  }
}

function rampBgm(context: AudioContext, target: number, timeConstant: number): void {
  if (!bgmGain) return;
  try {
    const now = context.currentTime;
    bgmGain.gain.cancelScheduledValues(now);
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
    bgmGain.gain.setTargetAtTime(target, now, timeConstant / 3);
  } catch { /* A closed context must not interrupt the caller. */ }
}

function startBgm(context: AudioContext): void {
  if (bgmSource || bgmPending) return;
  bgmPending = loadSample(bgmTrack)
    .then(buffer => {
      bgmPending = null;
      // Conditions may have changed while the 4 MB track was decoding.
      if (!buffer || bgmSource || !audioContext || !master || audioContext !== context) return;
      if (!enabled || bgmHidden || context.state !== 'running') return;
      try {
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(master);
        source.onended = () => {
          if (bgmSource === source) { bgmSource = null; bgmGain = null; }
          try { source.disconnect(); gain.disconnect(); } catch { /* Already torn down. */ }
        };
        bgmSource = source;
        bgmGain = gain;
        source.start();
        rampBgm(context, BGM_VOLUME, BGM_FADE_SECONDS);
      } catch { /* Autoplay or device failures must never break gameplay. */ }
    })
    .catch(() => { bgmPending = null; });
}

/** Fade the music toward its desired state: on when sound is enabled and the tab is visible. */
function syncBgm(): void {
  const context = audioContext;
  if (!context || !master) return;
  if (!enabled || bgmHidden) {
    // Fade out but keep the looping source alive at zero gain for a seamless resume.
    rampBgm(context, 0, 0.35);
    return;
  }
  if (context.state === 'suspended') {
    // Auto-resume on tab focus; safe because the context was created from a user gesture.
    void context.resume().then(() => syncBgm()).catch(() => undefined);
    return;
  }
  if (context.state !== 'running') return;
  if (bgmGain) {
    rampBgm(context, BGM_VOLUME, BGM_FADE_SECONDS);
    return;
  }
  startBgm(context);
}

function stopChannel(channel: Channel): number {
  revisions[channel] += 1;
  for (const voice of voices) {
    if (voice.channel !== channel) continue;
    try {
      const now = audioContext!.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0, now, 0.008);
      voice.source.stop(now + 0.03);
    } catch { /* A finished source may already have stopped. */ }
    voices.delete(voice);
  }
  return revisions[channel];
}

/** Cancels playing sources and invalidates samples that are still downloading or decoding. */
export function stopAllSounds(): void {
  (Object.keys(revisions) as Channel[]).forEach(stopChannel);
}

export function setAudioEnabled(value: boolean): void {
  enabled = value;
  if (master && audioContext) master.gain.setTargetAtTime(value ? 0.42 : 0, audioContext.currentTime, 0.015);
  if (!value) stopAllSounds();
  syncBgm();
}

function track(source: AudioScheduledSourceNode, gain: GainNode, channel: Channel): void {
  const voice = { source, gain, channel };
  voices.add(voice);
  source.onended = () => {
    voices.delete(voice);
    source.disconnect();
    gain.disconnect();
  };
}

function variant(pool: readonly string[]): string {
  const previous = lastVariant.get(pool);
  // Pick a different voice each time instead of repeating one grunt on every action.
  const index = previous === undefined ? Math.floor(Math.random() * pool.length)
    : (previous + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
  lastVariant.set(pool, index);
  return pool[index]!;
}

function sample(url: string, channel: Channel, volume: number, delay = 0, fallback?: () => void): void {
  const context = audioContext;
  if (!context || !master) return;
  const revision = revisions[channel];
  const when = context.currentTime + delay;
  void loadSample(url).then(buffer => {
    // A slow response, mute, or a new scene must not replay an obsolete action later.
    if (!enabled || revisions[channel] !== revision || context.state !== 'running' || context.currentTime > when + 0.35) return;
    try {
      if (!buffer) { fallback?.(); return; }
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(master!);
      track(source, gain, channel);
      source.start(Math.max(when, context.currentTime));
    } catch { /* Unsupported audio or a changed device leaves the game playable. */ }
  });
}

function note(frequency: number, delay: number, duration: number, volume = 0.3, type: OscillatorType = 'triangle', channel: Channel = 'ui'): void {
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
  track(oscillator, gain, channel);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.015);
}

function successFallback(): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => note(frequency, index * 0.09, 0.7, 0.2, 'triangle', 'result'));
}

/** Local action, cooking, and result samples, with synthesized UI cues and fallback tones. */
export function playSound(name: SoundName): void {
  if (!enabled) return;
  initAudio();
  if (!audioContext || !master) return;
  try {
    switch (name) {
      case 'pickup':
        stopChannel('pickup');
        sample(samples.pickup, 'pickup', 0.65, 0, () => {
          note(660, 0, 0.13, 0.25, 'sine', 'pickup');
          note(990, 0.07, 0.22, 0.2, 'sine', 'pickup');
        });
        break;
      case 'select':
      case 'click':
        stopChannel('ui');
        note(name === 'select' ? 540 : 360, 0, name === 'select' ? 0.09 : 0.06, 0.12);
        break;
      case 'hold':
        stopChannel('voice');
        sample(variant(samples.lift), 'voice', 1.65);
        break;
      case 'cook': {
        stopChannel('voice');
        stopChannel('cooking');
        // The first ingredient leaves the hands at 0.18 s; one throw voice accompanies the batch.
        sample(variant(samples.throw), 'voice', 1.4, 0.18);
        // The 4.90 s track follows the throw and ends just before the 5.6 s result transition.
        sample(samples.cook, 'cooking', 1.8, 0.6);
        break;
      }
      case 'success':
      case 'discovery':
        stopChannel('result');
        stopChannel('voice');
        sample(samples.success, 'result', 2.2, 0, successFallback);
        sample(variant(samples.laugh), 'voice', 1.65, 0.75);
        break;
      case 'failure':
        stopChannel('result');
        sample(samples.failure, 'result', 1.65);
        [311.13, 293.66, 196].forEach((frequency, index) => note(frequency, 0.25 + index * 0.16, 0.42, 0.2, 'triangle', 'result'));
        break;
    }
  } catch {
    // Muting, device changes, or a suspended context must never reject a game action.
  }
}
