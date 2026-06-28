import { words } from './words.js';

export const DEFAULT_WORD_COUNT = 90;

export function shuffleWords(
  wordCount = DEFAULT_WORD_COUNT,
  wordList = words,
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

export function calculateStats(targetText, typedText, elapsedSeconds) {
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
  const accuracy =
    typedText.length === 0
      ? 100
      : Math.round((correctChars / typedText.length) * 100);

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

export function getModeLabel(testType, testValue, trainingMode = 'standard') {
  const baseLabel = testType === 'words' ? `${testValue} words` : `${testValue}s`;
  const trainingLabel = trainingMode.replace(/-/g, ' ');

  return trainingMode === 'standard'
    ? baseLabel
    : `${trainingLabel} ${baseLabel}`;
}

export function getTimeLeft(testValue, elapsedSeconds) {
  const normalizedElapsedSeconds = Number.isFinite(elapsedSeconds)
    ? elapsedSeconds
    : 0;

  return Math.max(0, testValue - Math.floor(normalizedElapsedSeconds));
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

  const hasJumpedForward = inputValue.length > currentTypedText.length + 1;
  const maxLength = hasJumpedForward
    ? currentTypedText.length + 1
    : targetText.length;

  return inputValue.slice(0, maxLength);
}
