const KEY_SOUND_SRC = '/audio/kSound.mp3';
const KEY_SOUND_POOL_SIZE = 8;

export function createKeyAudio(volume) {
  const audio = new Audio(KEY_SOUND_SRC);
  audio.preload = 'auto';
  audio.volume = volume;
  return audio;
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

export function playKeySound(audioPoolRef, audioContextRef, volume, style) {
  if (volume <= 0) return;
  if (style !== 'click') {
    playToneSound(audioContextRef, volume, style);
    return;
  }

  if (typeof Audio === 'undefined') return;

  if (audioPoolRef.current.length === 0) {
    audioPoolRef.current.push(createKeyAudio(volume));
  }

  const availableAudio = audioPoolRef.current.find(
    (audio) => audio.paused || audio.ended
  );
  const audio =
    availableAudio ||
    (audioPoolRef.current.length < KEY_SOUND_POOL_SIZE
      ? createKeyAudio(volume)
      : audioPoolRef.current[0]);

  if (!audioPoolRef.current.includes(audio)) {
    audioPoolRef.current.push(audio);
  }

  audio.volume = volume;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}