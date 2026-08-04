import { englishWords } from './languages/english.js';
import { getLanguageModeLabel } from './languages.js';

export const DEFAULT_WORD_COUNT = 90;

export function shuffleWords(
  wordCount = DEFAULT_WORD_COUNT,
  wordList = englishWords,
  random = Math.random
) {
  const uniqueWords = [...new Set(wordList)];
  const generatedWords = [];

  if (wordCount <= 0 || uniqueWords.length === 0) return '';

  while (generatedWords.length < wordCount) {
    const nextWords = [...uniqueWords];

    for (let index = nextWords.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(random() * (index + 1));
      [nextWords[index], nextWords[randomIndex]] = [
        nextWords[randomIndex],
        nextWords[index]
      ];
    }

    if (
      generatedWords.length > 0 &&
      nextWords.length > 1 &&
      generatedWords[generatedWords.length - 1] === nextWords[0]
    ) {
      [nextWords[0], nextWords[1]] = [nextWords[1], nextWords[0]];
    }

    generatedWords.push(...nextWords);
  }

  return generatedWords.slice(0, wordCount).join(' ');
}

export function calculateStats(
  targetText,
  typedText,
  elapsedSeconds,
  historicalMistakeCount
) {
  let correctChars = 0;
  let wrongChars = 0;

  for (let index = 0; index < typedText.length; index += 1) {
    if (typedText[index] === targetText[index]) {
      correctChars += 1;
    } else {
      wrongChars += 1;
    }
  }

  const normalizedElapsedSeconds = Number.isFinite(elapsedSeconds)
    ? elapsedSeconds
    : 0;
  const safeElapsedSeconds = Math.max(0.1, normalizedElapsedSeconds);
  const wpm = Math.round(correctChars / 5 / (safeElapsedSeconds / 60));

  // By default accuracy only reflects the *current* diff between typedText
  // and targetText, so a mistake that was later corrected disappears
  // entirely. When historicalMistakeCount is provided (the count of
  // character positions that were ever mistyped during the run, even if
  // fixed afterwards), use that instead so corrected mistakes still count
  // against accuracy.
  const effectiveWrongForAccuracy = Number.isFinite(historicalMistakeCount)
    ? Math.max(wrongChars, Math.min(historicalMistakeCount, typedText.length))
    : wrongChars;
  const accuracy =
    typedText.length === 0
      ? 100
      : Math.round(
          ((typedText.length - effectiveWrongForAccuracy) / typedText.length) * 100
        );

  return {
    accuracy,
    correctChars,
    elapsedSeconds: safeElapsedSeconds,
    mistakes: wrongChars,
    wpm,
    wrongChars
  };
}

export function buildWordTokens(text) {
  let charIndex = 0;
  if (!text) return [];

  return text.split(' ').map((word, wordIndex, wordArray) => {
    const letters = word.split('').map((char) => {
      const token = { char, index: charIndex };
      charIndex += 1;
      return token;
    });

    const space =
      wordIndex < wordArray.length - 1
        ? {
            char: ' ',
            index: charIndex++
          }
        : null;

    return {
      id: `${word}-${wordIndex}`,
      letters,
      space
    };
  });
}

export function getTargetWordCount(testType, testValue) {
  return testType === 'words' ? testValue : DEFAULT_WORD_COUNT;
}

export function getModeLabel(
  testType,
  testValue,
  trainingMode = 'standard',
  language = 'english'
) {
  const baseLabel = testType === 'words' ? `${testValue} words` : `${testValue}s`;
  const modeLabel =
    trainingMode === 'standard'
      ? getLanguageModeLabel(language)
      : trainingMode.replace(/-/g, ' ');

  return modeLabel ? `${modeLabel} ${baseLabel}` : baseLabel;
}

export function getTimeLeft(testValue, elapsedSeconds) {
  const normalizedElapsedSeconds = Number.isFinite(elapsedSeconds)
    ? elapsedSeconds
    : 0;

  return Math.max(0, testValue - Math.floor(normalizedElapsedSeconds));
}

// Finds the length of the leading run of typedText that consists of
// complete words which were each typed correctly and followed by a
// correctly-typed space. Once a word is finished correctly, backspace
// should not be able to re-enter it — only words that still contain an
// uncorrected mistake stay editable.
export function getLockedPrefixLength(targetText, typedText) {
  let floor = 0;
  let wordStart = 0;

  for (let index = wordStart; index < typedText.length; index += 1) {
    if (targetText[index] !== ' ') continue;

    const wordCorrect =
      typedText.slice(wordStart, index) === targetText.slice(wordStart, index);
    const spaceCorrect = typedText[index] === ' ';

    if (!wordCorrect || !spaceCorrect) break;

    floor = index + 1;
    wordStart = index + 1;
  }

  return floor;
}

export function getNextTypedText(
  targetText,
  currentTypedText,
  inputValue,
  allowBackspace = true
) {
  if (!allowBackspace && inputValue.length < currentTypedText.length) {
    return currentTypedText;
  }

  if (allowBackspace && inputValue.length < currentTypedText.length) {
    const lockedLength = getLockedPrefixLength(targetText, currentTypedText);

    if (inputValue.length < lockedLength) {
      return currentTypedText.slice(0, lockedLength);
    }
  }

  const hasJumpedForward = inputValue.length > currentTypedText.length + 1;
  const maxLength = hasJumpedForward
    ? currentTypedText.length + 1
    : targetText.length;

  const nextTypedText = inputValue.slice(0, maxLength);
  const unresolvedSpaceMistakeIndex = [...currentTypedText].findIndex(
    (typedChar, index) => targetText[index] === ' ' && typedChar !== ' '
  );
  const hasUnresolvedSpaceMistake =
    unresolvedSpaceMistakeIndex !== -1;

  if (hasUnresolvedSpaceMistake) {
    const typedChar = nextTypedText[currentTypedText.length];

    if (nextTypedText.length < currentTypedText.length) {
      return nextTypedText;
    }

    if (nextTypedText.length === currentTypedText.length + 1 && typedChar === ' ') {
      return `${currentTypedText.slice(0, unresolvedSpaceMistakeIndex)} `;
    }

    return nextTypedText;
  }

  const isAddingSingleCharacter = nextTypedText.length === currentTypedText.length + 1;
  const expectedChar = targetText[currentTypedText.length];
  const typedChar = nextTypedText[currentTypedText.length];

  if (isAddingSingleCharacter && expectedChar === ' ' && typedChar !== ' ') {
    return nextTypedText;
  }

  return nextTypedText;
}

const KEY_CODE_BY_CHAR = {
  ' ': 'Space',
  a: 'KeyA',
  b: 'KeyB',
  c: 'KeyC',
  d: 'KeyD',
  e: 'KeyE',
  f: 'KeyF',
  g: 'KeyG',
  h: 'KeyH',
  i: 'KeyI',
  j: 'KeyJ',
  k: 'KeyK',
  l: 'KeyL',
  m: 'KeyM',
  n: 'KeyN',
  o: 'KeyO',
  p: 'KeyP',
  q: 'KeyQ',
  r: 'KeyR',
  s: 'KeyS',
  t: 'KeyT',
  u: 'KeyU',
  v: 'KeyV',
  w: 'KeyW',
  x: 'KeyX',
  y: 'KeyY',
  z: 'KeyZ'
};

export function buildMistakeKeyCounts(targetText = '', typedText = '', keystrokeLog = []) {
  const counts = {};

  const recordMistake = (character, index) => {
    if (character === targetText[index]) return;

    const code = KEY_CODE_BY_CHAR[String(character || '').toLowerCase()];
    if (!code) return;
    counts[code] = (counts[code] || 0) + 1;
  };

  const snapshots = Array.isArray(keystrokeLog)
    ? keystrokeLog.filter((event) => typeof event?.text === 'string')
    : [];

  if (snapshots.length) {
    let previousText = '';

    snapshots.forEach(({ text }) => {
      let sharedLength = 0;
      const comparableLength = Math.min(previousText.length, text.length);

      while (
        sharedLength < comparableLength &&
        previousText[sharedLength] === text[sharedLength]
      ) {
        sharedLength += 1;
      }

      for (let index = sharedLength; index < text.length; index += 1) {
        recordMistake(text[index], index);
      }

      previousText = text;
    });

    return counts;
  }

  const length = Math.min(targetText.length, typedText.length);

  for (let index = 0; index < length; index += 1) {
    recordMistake(typedText[index], index);
  }

  return counts;
}