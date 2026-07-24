import { loadCreamConfig, scancodeForEvent, creamAssetPath } from './creamPack.js';

const KEY_SOUND_SOURCES = {
  click: '/audio/kSound.mp3',
};
const KEY_SOUND_POOL_SIZE = 8;

export function createKeyAudio(volume, src) {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.volume = volume;
  return audio;
}

function playPooled(poolsRef, poolKey, src, volume) {
  if (!poolsRef.current[poolKey]) poolsRef.current[poolKey] = [];
  const pool = poolsRef.current[poolKey];

  if (pool.length === 0) {
    pool.push(createKeyAudio(volume, src));
  }

  const availableAudio = pool.find((audio) => audio.paused || audio.ended);
  const audio =
    availableAudio ||
    (pool.length < KEY_SOUND_POOL_SIZE ? createKeyAudio(volume, src) : pool[0]);

  if (!pool.includes(audio)) {
    pool.push(audio);
  }

  audio.volume = volume;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playCreamSound(poolsRef, volume, event) {
  loadCreamConfig().then((config) => {
    if (!config || !config.defines) return;

    const scancode = event ? scancodeForEvent(event) : null;
    const define =
      (scancode !== null && config.defines[String(scancode)]) ||
      config.defines.default;
    if (!define) return;

    // "single" packs: one shared sprite file, per-key [startMs, durationMs] clips
    if (config.key_define_type === 'single' && Array.isArray(define)) {
      const src = creamAssetPath(config.sound || '');
      const audio = createKeyAudio(volume, src);
      const [startMs, durationMs] = define;
      audio.currentTime = startMs / 1000;
      audio.play().catch(() => {});
      setTimeout(() => audio.pause(), durationMs);
      return;
    }

    // "multi" packs: one small audio file per key (this is what NK Cream uses)
    if (typeof define === 'string') {
      const fileName = define.replace(/^#\//, '');
      const src = creamAssetPath(fileName);
      playPooled(poolsRef, fileName, src, volume);
    }
  });
}

export function playToneSound(audioContextRef, volume, style) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioContext();
  }

  const audioContext = audioContextRef.current;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const startedAt = audioContext.currentTime;
  const isBright = style === 'bright';

  oscillator.type = isBright ? 'square' : 'sine';
  oscillator.frequency.setValueAtTime(isBright ? 980 : 420, startedAt);
  oscillator.frequency.exponentialRampToValueAtTime(
    isBright ? 520 : 260,
    startedAt + 0.055
  );
  gain.gain.setValueAtTime(Math.max(0.001, volume * (isBright ? 0.08 : 0.12)), startedAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startedAt + (isBright ? 0.035 : 0.06));

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startedAt);
  oscillator.stop(startedAt + (isBright ? 0.04 : 0.07));
}

export function playKeySound(poolsRef, audioContextRef, volume, style, event) {
  if (volume <= 0) return;

  if (style === 'cream') {
    playCreamSound(poolsRef, volume, event);
    return;
  }

  if (style !== 'click') {
    playToneSound(audioContextRef, volume, style);
    return;
  }

  if (typeof Audio === 'undefined') return;

  playPooled(poolsRef, 'click', KEY_SOUND_SOURCES.click, volume);
}