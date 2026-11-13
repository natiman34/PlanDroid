import type { AlarmSound, FocusAudioTrack } from '../types';

// 100% offline Web Audio API sound synthesizer
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play configurable alarm sound when a focus timer completes
 */
export function playAlarmSound(sound: AlarmSound = 'bell', volume = 0.8) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const safeVol = Math.max(0.05, Math.min(1, volume));
    const now = ctx.currentTime;

    switch (sound) {
      case 'digital': {
        // Digital 3-beep alarm pattern: beep-beep-beep
        [0, 0.22, 0.44].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, now + offset); // A5

          gain.gain.setValueAtTime(0.001, now + offset);
          gain.gain.linearRampToValueAtTime(0.25 * safeVol, now + offset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.16);
        });
        break;
      }

      case 'harp': {
        // Gentle relaxing harp arpeggio (Pentatonic: C5, D5, E5, G5, A5, C6)
        const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.1;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.22 * safeVol, start + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.8);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.8);
        });
        break;
      }

      case 'chime': {
        // Dual harmonic chime
        [587.33, 880, 1174.66].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.12;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.25 * safeVol, start + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.9);
        });
        break;
      }

      case 'bell':
      default: {
        // Resonant meditation bell with multiple harmonic partials
        const fundamental = 440; // A4
        const partials = [
          { mult: 1.0, gain: 0.35, decay: 1.4 },
          { mult: 2.0, gain: 0.20, decay: 1.1 },
          { mult: 3.01, gain: 0.15, decay: 0.8 },
          { mult: 4.16, gain: 0.08, decay: 0.5 },
        ];

        partials.forEach((p) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(fundamental * p.mult, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(p.gain * safeVol, now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + p.decay);
        });
        break;
      }
    }
  } catch {
    // Audio context may be restricted before user gesture
  }
}

let activeAlarmInterval: NodeJS.Timeout | null = null;

/**
 * Starts repeating alarm sound loop that fires until explicitly stopped (snooze/dismiss)
 * - repeatSeconds === 0: Sustained continuous pulsing (every 2.5s)
 * - repeatSeconds === -1: Play once only
 * - repeatSeconds > 0: Repeat at the specified second interval (15s, 30s, 60s, etc.)
 */
export function startAlarmLoop(sound: AlarmSound = 'bell', volume = 0.8, repeatSeconds = 0) {
  stopAlarmLoop();
  
  // Play initial alarm chime immediately
  playAlarmSound(sound, volume);

  // If -1, user selected "play once only"
  if (repeatSeconds === -1) {
    return;
  }

  // 0 means sustained continuous alarm pulse (every 2.5 seconds)
  const intervalMs = repeatSeconds === 0 ? 2500 : Math.max(5, repeatSeconds) * 1000;

  activeAlarmInterval = setInterval(() => {
    playAlarmSound(sound, volume);
  }, intervalMs);
}

/**
 * Stops any active repeating alarm loop
 */
export function stopAlarmLoop() {
  if (activeAlarmInterval) {
    clearInterval(activeAlarmInterval);
    activeAlarmInterval = null;
  }
}

export function isAlarmLoopActive(): boolean {
  return activeAlarmInterval !== null;
}

/**
 * 1-minute warning tone: distinct dual-beep alerting the user that 60s remain
 */
export function playOneMinuteWarning(volume = 0.6) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const safeVol = Math.max(0.05, Math.min(1, volume));

    // Two rapid crisp tones (659Hz -> 880Hz)
    [
      { freq: 659.25, time: now },
      { freq: 880.0, time: now + 0.15 },
    ].forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.25 * safeVol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.12);
    });
  } catch {
    // ignore
  }
}

// Ordinary UI chime removed - interactions respond silently
export function playChime() {
  // Silent: ordinary UI interaction sounds removed
}

// Upbeat celebration arpeggio when a task is completed (task completion chime)
export function playSuccess() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.01, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.35);
    });
  } catch {
    // ignore
  }
}

// Button and UI click sounds removed - all buttons and controls respond silently
export function playTick() {
  // Silent: all button-clicking and tap audio removed
}

// ============================================================================
// Offline Focus Audio Synthesizer (Ambient & White Noise Loops for Deep Work)
// ============================================================================

interface FocusAudioEngineState {
  track: FocusAudioTrack;
  volume: number;
  masterGain: GainNode | null;
  nodes: AudioNode[];
  sources: Array<{ stop: () => void; disconnect: () => void }>;
}

const focusAudioState: FocusAudioEngineState = {
  track: 'off',
  volume: 0.45,
  masterGain: null,
  nodes: [],
  sources: [],
};

function createCrossfadedNoiseBuffer(
  ctx: AudioContext,
  type: 'white' | 'brown' | 'rain',
  durationSeconds = 4
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(sampleRate, Math.floor(sampleRate * durationSeconds));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (type === 'brown') {
      lastOut = (lastOut + 0.025 * white) / 1.025;
      data[i] = Math.max(-1, Math.min(1, lastOut * 3.2));
    } else if (type === 'rain') {
      // Slightly warmer pink-ish noise texture
      lastOut = 0.92 * lastOut + 0.08 * white;
      const droplet = Math.random() > 0.9965 ? (Math.random() * 0.45 - 0.225) : 0;
      data[i] = Math.max(-1, Math.min(1, lastOut * 1.9 + white * 0.12 + droplet));
    } else {
      data[i] = white * 0.55;
    }
  }

  // Smooth loop seam with short crossfade at edges so looped playback has zero clicks
  const fadeSamples = Math.min(2048, Math.floor(length * 0.05));
  for (let i = 0; i < fadeSamples; i++) {
    const t = i / fadeSamples;
    const endIdx = length - fadeSamples + i;
    const startVal = data[i];
    const endVal = data[endIdx];
    data[i] = startVal * t + endVal * (1 - t);
    data[endIdx] = endVal * t + startVal * (1 - t);
  }

  return buffer;
}

function cleanupFocusAudioNodes(immediate = false) {
  const { masterGain, nodes, sources } = focusAudioState;
  focusAudioState.masterGain = null;
  focusAudioState.nodes = [];
  focusAudioState.sources = [];

  if (!masterGain && nodes.length === 0 && sources.length === 0) {
    return;
  }

  const teardown = () => {
    sources.forEach((src) => {
      try {
        src.stop();
      } catch {
        // ignore already stopped source
      }
      try {
        src.disconnect();
      } catch {
        // ignore
      }
    });
    nodes.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    });
  };

  if (masterGain && audioCtx && !immediate) {
    try {
      const now = audioCtx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      setTimeout(teardown, 95);
      return;
    } catch {
      // fall through to immediate teardown
    }
  }

  teardown();
}

export function startFocusAudio(track: FocusAudioTrack, volume = 0.45): boolean {
  const safeVol = Math.max(0.05, Math.min(1, volume));
  focusAudioState.volume = safeVol;

  if (track === 'off') {
    stopFocusAudio();
    return false;
  }

  // Tear down any previous loop immediately before starting the new track
  cleanupFocusAudioNodes(true);

  try {
    const ctx = getAudioContext();
    if (!ctx) {
      focusAudioState.track = 'off';
      return false;
    }

    const masterGain = ctx.createGain();
    const now = ctx.currentTime;
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.connect(ctx.destination);

    const createdNodes: AudioNode[] = [masterGain];
    const createdSources: Array<{ stop: () => void; disconnect: () => void }> = [];
    let targetGain = safeVol * 0.4;

    if (track === 'brown_noise') {
      const buffer = createCrossfadedNoiseBuffer(ctx, 'brown', 4);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, now);
      filter.Q.setValueAtTime(0.7, now);

      source.connect(filter);
      filter.connect(masterGain);
      source.start(now);

      targetGain = safeVol * 0.55;
      createdSources.push(source);
      createdNodes.push(filter);
    } else if (track === 'white_noise') {
      const buffer = createCrossfadedNoiseBuffer(ctx, 'white', 4);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(4800, now);

      source.connect(filter);
      filter.connect(masterGain);
      source.start(now);

      targetGain = safeVol * 0.22;
      createdSources.push(source);
      createdNodes.push(filter);
    } else if (track === 'rain') {
      const buffer = createCrossfadedNoiseBuffer(ctx, 'rain', 5);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1050, now);
      bandpass.Q.setValueAtTime(0.45, now);

      const warmth = ctx.createBiquadFilter();
      warmth.type = 'lowpass';
      warmth.frequency.setValueAtTime(2400, now);

      // Gentle rain swell LFO
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.14, now);
      lfoGain.gain.setValueAtTime(0.06 * safeVol, now);

      source.connect(bandpass);
      bandpass.connect(warmth);
      warmth.connect(masterGain);

      lfo.connect(lfoGain);
      lfoGain.connect(masterGain.gain);

      source.start(now);
      lfo.start(now);

      targetGain = safeVol * 0.42;
      createdSources.push(source, lfo);
      createdNodes.push(bandpass, warmth, lfoGain);
    } else if (track === 'alpha_wave') {
      // Soft harmonic ambient pad with gentle 10Hz alpha pulse
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);
      filter.connect(masterGain);
      createdNodes.push(filter);

      const freqs = [174, 184, 261.63];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        oscGain.gain.setValueAtTime(idx === 2 ? 0.16 : 0.34, now);

        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start(now);

        createdSources.push(osc);
        createdNodes.push(oscGain);
      });

      targetGain = safeVol * 0.28;
    }

    masterGain.gain.linearRampToValueAtTime(targetGain, now + 0.18);

    focusAudioState.track = track;
    focusAudioState.masterGain = masterGain;
    focusAudioState.nodes = createdNodes;
    focusAudioState.sources = createdSources;
    return true;
  } catch {
    focusAudioState.track = 'off';
    cleanupFocusAudioNodes(true);
    return false;
  }
}

export function stopFocusAudio() {
  focusAudioState.track = 'off';
  cleanupFocusAudioNodes(false);
}

export function setFocusAudioVolume(volume: number) {
  const safeVol = Math.max(0.05, Math.min(1, volume));
  focusAudioState.volume = safeVol;

  if (!focusAudioState.masterGain || !audioCtx || focusAudioState.track === 'off') {
    return;
  }

  try {
    const scaleMap: Record<Exclude<FocusAudioTrack, 'off'>, number> = {
      brown_noise: 0.55,
      white_noise: 0.22,
      rain: 0.42,
      alpha_wave: 0.28,
    };
    const scale = scaleMap[focusAudioState.track] ?? 0.4;
    const now = audioCtx.currentTime;
    focusAudioState.masterGain.gain.cancelScheduledValues(now);
    focusAudioState.masterGain.gain.setTargetAtTime(safeVol * scale, now, 0.05);
  } catch {
    // ignore
  }
}

export function isFocusAudioPlaying(): boolean {
  return focusAudioState.track !== 'off' && focusAudioState.sources.length > 0;
}

export function getActiveFocusAudioTrack(): FocusAudioTrack {
  return focusAudioState.track;
}

