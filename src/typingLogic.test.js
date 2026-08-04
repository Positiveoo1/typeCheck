import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWordTokens,
  buildMistakeKeyCounts,
  calculateStats,
  getModeLabel,
  getNextTypedText,
  getTargetWordCount,
  getTimeLeft,
  shuffleWords
} from './typingLogic.js';
import { frenchWords } from './languages/french.js';
import { polishWords } from './languages/polish.js';
import { russianWords } from './languages/russian.js';
import { spanishWords } from './languages/spanish.js';
import { uzbekWords } from './languages/uzbek.js';
import { buildCustomTarget, buildTrainingTarget } from './trainingModes.js';

describe('calculateStats', () => {
  it('returns neutral stats before the user types', () => {
    const stats = calculateStats('hello world', '', 0);

    assert.equal(stats.accuracy, 100);
    assert.equal(stats.correctChars, 0);
    assert.equal(stats.wrongChars, 0);
    assert.equal(stats.mistakes, 0);
    assert.equal(stats.wpm, 0);
    assert.equal(stats.elapsedSeconds, 0.1);
  });

  it('calculates WPM from correct characters using the standard five-character word', () => {
    const typedText = 'abcdefghijklmnopqrstuvwxy';
    const stats = calculateStats(typedText, typedText, 30);

    assert.equal(stats.correctChars, 25);
    assert.equal(stats.wrongChars, 0);
    assert.equal(stats.accuracy, 100);
    assert.equal(stats.wpm, 10);
    assert.equal(stats.elapsedSeconds, 30);
  });

  it('counts mistakes and rounds accuracy correctly', () => {
    const stats = calculateStats('abcd ef', 'abxd yf', 30);

    assert.equal(stats.correctChars, 5);
    assert.equal(stats.wrongChars, 2);
    assert.equal(stats.mistakes, 2);
    assert.equal(stats.accuracy, 71);
    assert.equal(stats.wpm, 2);
  });

  it('counts extra typed characters as wrong characters', () => {
    const stats = calculateStats('abc', 'abcd', 60);

    assert.equal(stats.correctChars, 3);
    assert.equal(stats.wrongChars, 1);
    assert.equal(stats.accuracy, 75);
    assert.equal(stats.wpm, 1);
  });

  it('keeps WPM finite when elapsed time is zero, negative, or invalid', () => {
    for (const elapsedSeconds of [0, -4, Number.NaN, Number.POSITIVE_INFINITY]) {
      const stats = calculateStats('abcde', 'abcde', elapsedSeconds);

      assert.equal(Number.isFinite(stats.wpm), true);
      assert.equal(stats.elapsedSeconds, 0.1);
    }
  });
});

describe('getNextTypedText', () => {
  it('accepts normal single-character progress', () => {
    assert.equal(getNextTypedText('hello', 'he', 'hel'), 'hel');
  });

  it('allows deleting characters', () => {
    assert.equal(getNextTypedText('hello', 'hell', 'hel'), 'hel');
  });

  it('can prevent deleting characters in strict mode', () => {
    assert.equal(getNextTypedText('hello', 'hell', 'hel', false), 'hell');
  });

  it('limits paste or autofill jumps to one new character', () => {
    assert.equal(getNextTypedText('hello world', 'he', 'hello world'), 'hel');
  });

  it('shows wrong boundary characters but requires space before moving on', () => {
    assert.equal(getNextTypedText('hello world', 'hello', 'hellox'), 'hellox');
    assert.equal(getNextTypedText('hello world', 'hellox', 'helloxy'), 'helloxy');
    assert.equal(getNextTypedText('hello world', 'helloxy', 'hellox'), 'hellox');
    assert.equal(getNextTypedText('hello world', 'helloxy', 'helloxy '), 'hello ');
    assert.equal(getNextTypedText('hello world', 'hello', 'hello '), 'hello ');
  });

  it('never lets typed text grow beyond the target text', () => {
    assert.equal(getNextTypedText('hello', 'hell', 'hello!!!'), 'hello');
  });

  it('stops backspace from re-entering a word that was already typed correctly', () => {
    const target = 'hello world';

    // Typed "hello" (correct) + space + "wo" of the next word, then
    // backspaces all the way back past the word boundary.
    assert.equal(getNextTypedText(target, 'hello wo', 'hello w'), 'hello w');
    assert.equal(getNextTypedText(target, 'hello w', 'hello '), 'hello ');
    // Trying to delete the trailing space (and re-enter "hello") is blocked.
    assert.equal(getNextTypedText(target, 'hello ', 'hello'), 'hello ');
    assert.equal(getNextTypedText(target, 'hello ', ''), 'hello ');
  });

  it('still allows backspacing into a word that was finished with a mistake', () => {
    const target = 'hello world';

    // "hbllo" (wrong) + space typed already — the mistake was never fixed
    // before moving on, so backspace should be able to reach it.
    assert.equal(getNextTypedText(target, 'hbllo wo', 'hbllo w'), 'hbllo w');
    assert.equal(getNextTypedText(target, 'hbllo w', 'hbllo '), 'hbllo ');
    assert.equal(getNextTypedText(target, 'hbllo ', 'hbllo'), 'hbllo');
    assert.equal(getNextTypedText(target, 'hbllo', 'hb'), 'hb');
  });

  it('locks each correct word in a multi-word run independently', () => {
    const target = 'the cat sat';

    // "the" and "cat" both correct, "sat" still in progress — backspacing
    // may edit "sat" freely but not cross back into "cat" or "the".
    assert.equal(getNextTypedText(target, 'the cat sa', 'the cat s'), 'the cat s');
    assert.equal(getNextTypedText(target, 'the cat s', 'the cat '), 'the cat ');
    assert.equal(getNextTypedText(target, 'the cat ', 'the cat'), 'the cat ');
  });
});

describe('buildMistakeKeyCounts', () => {
  it('keeps corrected mistakes so completed tests show error-prone keys', () => {
    const counts = buildMistakeKeyCounts('cat', 'cat', [
      { t: 10, text: 'c' },
      { t: 20, text: 'cx' },
      { t: 30, text: 'c' },
      { t: 40, text: 'ca' },
      { t: 50, text: 'cat' }
    ]);

    assert.deepEqual(counts, { KeyX: 1 });
  });

  it('falls back to the completed text when detailed keystrokes are unavailable', () => {
    assert.deepEqual(buildMistakeKeyCounts('cat', 'car'), { KeyR: 1 });
  });
});

describe('time and mode helpers', () => {
  it('calculates countdown time using elapsed seconds', () => {
    assert.equal(getTimeLeft(30, 0), 30);
    assert.equal(getTimeLeft(30, 0.9), 30);
    assert.equal(getTimeLeft(30, 1.1), 29);
    assert.equal(getTimeLeft(30, 30.2), 0);
    assert.equal(getTimeLeft(30, Number.NaN), 30);
  });

  it('labels test modes clearly', () => {
    assert.equal(getModeLabel('time', 30), '30s');
    assert.equal(getModeLabel('words', 10), '10 words');
    assert.equal(getModeLabel('time', 30, 'accuracy-lock'), 'accuracy lock 30s');
    assert.equal(getModeLabel('words', 10, 'code'), 'code 10 words');
    assert.equal(getModeLabel('time', 30, 'standard', 'uzbek'), 'uzbek 30s');
  });

  it('uses fixed generated words for time mode and chosen length for word mode', () => {
    assert.equal(getTargetWordCount('time', 30), 90);
    assert.equal(getTargetWordCount('words', 10), 10);
  });
});

describe('training modes', () => {
  it('builds target text for custom training modes', () => {
    const codeTarget = buildTrainingTarget({
      random: () => 0,
      testType: 'words',
      testValue: 8,
      trainingMode: 'code'
    });
    const numberTarget = buildTrainingTarget({
      random: () => 0,
      testType: 'words',
      testValue: 6,
      trainingMode: 'numbers'
    });

    assert.equal(codeTarget.split(/\s+/).length, 8);
    assert.match(codeTarget, /const|function|event|export|users/);
    assert.equal(numberTarget.split(/\s+/).length, 6);
    assert.match(numberTarget, /\d/);
  });

  it('fills longer training targets by reshuffling small pools', () => {
    const weakTarget = buildTrainingTarget({
      random: () => 0,
      testType: 'words',
      testValue: 60,
      trainingMode: 'weak'
    });
    const numberTarget = buildTrainingTarget({
      random: () => 0,
      testType: 'words',
      testValue: 60,
      trainingMode: 'numbers'
    });

    assert.equal(weakTarget.split(/\s+/).length, 60);
    assert.equal(numberTarget.split(/\s+/).length, 60);
  });

  it('builds custom targets from the exact user text', () => {
    const customTarget = buildCustomTarget({
      customText: 'alpha   beta',
      testType: 'words',
      testValue: 5
    });

    assert.equal(customTarget, 'alpha beta');
  });

  it('falls back to standard words when custom text is blank', () => {
    const customTarget = buildTrainingTarget({
      customText: '   ',
      testType: 'words',
      testValue: 4,
      trainingMode: 'custom'
    });

    assert.equal(customTarget.split(/\s+/).length, 4);
  });

  it('builds standard targets from the selected language word list', () => {
    const uzbekTarget = buildTrainingTarget({
      language: 'uzbek',
      random: () => 0,
      testType: 'words',
      testValue: 8,
      trainingMode: 'standard'
    });

    assert.equal(uzbekTarget.split(/\s+/).length, 8);
    assert.equal(
      uzbekTarget.split(/\s+/).every((word) => uzbekWords.includes(word)),
      true
    );

    const polishTarget = buildTrainingTarget({
      language: 'polish',
      random: () => 0,
      testType: 'words',
      testValue: 8,
      trainingMode: 'standard'
    });

    assert.equal(polishTarget.split(/\s+/).length, 8);
    assert.equal(
      polishTarget.split(/\s+/).every((word) => polishWords.includes(word)),
      true
    );

    const spanishTarget = buildTrainingTarget({
      language: 'spanish',
      random: () => 0,
      testType: 'words',
      testValue: 8,
      trainingMode: 'standard'
    });

    assert.equal(spanishTarget.split(/\s+/).length, 8);
    assert.equal(
      spanishTarget.split(/\s+/).every((word) => spanishWords.includes(word)),
      true
    );

    const russianTarget = buildTrainingTarget({
      language: 'russian',
      random: () => 0,
      testType: 'words',
      testValue: 8,
      trainingMode: 'standard'
    });

    assert.equal(russianTarget.split(/\s+/).length, 8);
    assert.equal(
      russianTarget.split(/\s+/).every((word) => russianWords.includes(word)),
      true
    );

    const frenchTarget = buildTrainingTarget({
      language: 'french',
      random: () => 0,
      testType: 'words',
      testValue: 8,
      trainingMode: 'standard'
    });

    assert.equal(frenchTarget.split(/\s+/).length, 8);
    assert.equal(
      frenchTarget.split(/\s+/).every((word) => frenchWords.includes(word)),
      true
    );
  });
});

describe('word generation and tokenizing', () => {
  it('generates a non-repeating word list for a single test', () => {
    const generatedText = shuffleWords(4, [
      'common',
      'parent',
      'common',
      'garden',
      'river',
      'parent'
    ]);
    const generatedWords = generatedText.split(' ');

    assert.equal(generatedWords.length, 4);
    assert.equal(new Set(generatedWords).size, 4);
  });

  it('reshuffles the available words when the requested amount is larger than the unique list', () => {
    const generatedWords = shuffleWords(10, ['one', 'two', 'two']).split(' ');

    assert.equal(generatedWords.length, 10);
    assert.deepEqual([...new Set(generatedWords)].sort(), ['one', 'two']);
  });

  it('keeps character indexes stable across words and spaces', () => {
    const tokens = buildWordTokens('go now');

    assert.deepEqual(
      tokens.flatMap((word) => [
        ...word.letters.map((letter) => [letter.char, letter.index]),
        word.space ? [word.space.char, word.space.index] : null
      ]).filter(Boolean),
      [
        ['g', 0],
        ['o', 1],
        [' ', 2],
        ['n', 3],
        ['o', 4],
        ['w', 5]
      ]
    );
  });
});