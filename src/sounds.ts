// Chess sound effects using Web Audio API — no external files needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume suspended context (required on mobile after user gesture)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Call this on first user interaction (tap/click) to unlock audio on mobile
export function unlockAudio() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  // Create and immediately play a silent buffer to unlock on iOS
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

function playNoise(duration: number, volume = 0.08) {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // Audio not available
  }
}

export function playMoveSound() {
  // Soft click — short woody tap
  playTone(800, 0.06, 'square', 0.08);
  playNoise(0.04, 0.04);
}

export function playCaptureSound() {
  // Sharper thud
  playTone(300, 0.1, 'square', 0.15);
  playNoise(0.08, 0.1);
}

export function playCheckSound() {
  // High alert ping
  playTone(880, 0.15, 'sine', 0.12);
  setTimeout(() => playTone(1100, 0.1, 'sine', 0.08), 80);
}

export function playCastleSound() {
  // Double tap
  playTone(600, 0.06, 'square', 0.08);
  setTimeout(() => {
    playTone(700, 0.06, 'square', 0.08);
    playNoise(0.03, 0.03);
  }, 80);
}

export function playGameOverSound(win: boolean) {
  if (win) {
    // Ascending triumph
    playTone(523, 0.15, 'sine', 0.1);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.1), 120);
    setTimeout(() => playTone(784, 0.25, 'sine', 0.12), 240);
  } else {
    // Descending
    playTone(440, 0.2, 'sine', 0.1);
    setTimeout(() => playTone(349, 0.2, 'sine', 0.1), 150);
    setTimeout(() => playTone(294, 0.3, 'sine', 0.08), 300);
  }
}

export function playIllegalSound() {
  playTone(200, 0.15, 'square', 0.1);
}
