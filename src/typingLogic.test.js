import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWordTokens,
  calculateStats,
  getModeLabel,
  getNextTypedText,
  getTargetWordCount,
  getTimeLeft,
  shuffleWords
} from './typingLogic.js';
import { buildTrainingTarget } from './trainingModes.js';

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

  it('never lets typed text grow beyond the target text', () => {
    assert.equal(getNextTypedText('hello', 'hell', 'hello!!!'), 'hello');
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
