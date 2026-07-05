import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  addCompletedResultToDashboard,
  createEmptyDashboard,
  DEFAULT_SETTINGS,
  isTooShortCustomTest,
  loadSettings,
  normalizeCustomTextSetting,
  normalizeDashboard,
  normalizeTimeMode,
  saveSettings,
  SETTINGS_KEY
} from './appState.js';

function installLocalStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));

  globalThis.localStorage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };

  return values;
}

afterEach(() => {
  delete globalThis.localStorage;
});

describe('settings normalization', () => {
  it('clamps custom time settings to the supported range', () => {
    assert.equal(normalizeTimeMode(1), 5);
    assert.equal(normalizeTimeMode(999), 300);
    assert.equal(normalizeTimeMode(22.6), 23);
    assert.equal(normalizeTimeMode(Number.NaN), DEFAULT_SETTINGS.timeMode);
  });

  it('normalizes custom text whitespace and falls back when blank', () => {
    assert.equal(
      normalizeCustomTextSetting(' alpha   beta\n gamma '),
      'alpha beta gamma'
    );
    assert.equal(normalizeCustomTextSetting('   '), DEFAULT_SETTINGS.customText);
  });

  it('loads only valid persisted settings and clamps numeric preferences', () => {
    installLocalStorage({
      [SETTINGS_KEY]: JSON.stringify({
        accentColor: '#00ffaa',
        customText: ' one   two ',
        mistakeMode: 'impossible',
        reducedMotion: true,
        showKeyboard: false,
        soundEnabled: false,
        soundStyle: 'bright',
        soundVolume: 4,
        testType: 'words',
        timeMode: 1000,
        trainingMode: 'code',
        wordMode: 999
      })
    });

    assert.deepEqual(loadSettings(), {
      ...DEFAULT_SETTINGS,
      accentColor: '#00ffaa',
      customText: 'one two',
      reducedMotion: true,
      showKeyboard: false,
      soundEnabled: false,
      soundStyle: 'bright',
      soundVolume: 1,
      testType: 'words',
      timeMode: 300,
      trainingMode: 'code'
    });
  });

  it('saves settings as JSON', () => {
    const values = installLocalStorage();

    saveSettings({ ...DEFAULT_SETTINGS, timeMode: 60 });

    assert.equal(JSON.parse(values.get(SETTINGS_KEY)).timeMode, 60);
  });
});

describe('custom test validation', () => {
  it('marks custom tests with fewer than ten non-space characters as too short', () => {
    assert.equal(
      isTooShortCustomTest({ trainingMode: 'custom', targetText: 'abc def 12' }),
      true
    );
    assert.equal(
      isTooShortCustomTest({ trainingMode: 'custom', targetText: 'abc def 1234' }),
      false
    );
    assert.equal(
      isTooShortCustomTest({ trainingMode: 'standard', targetText: 'short' }),
      false
    );
  });
});

describe('dashboard aggregation', () => {
  it('creates a dashboard with expected mode buckets', () => {
    const dashboard = createEmptyDashboard();

    assert.equal(dashboard.started, 0);
    assert.deepEqual(Object.keys(dashboard.modes), [
      '15s',
      '30s',
      '60s',
      '10 words',
      '30 words',
      '60 words'
    ]);
  });

  it('adds completed results and updates totals, bests, and history', () => {
    const dashboard = createEmptyDashboard();
    const nextDashboard = addCompletedResultToDashboard(
      dashboard,
      {
        accuracy: 96,
        correctChars: 47,
        elapsedSeconds: 30,
        modeLabel: '30s',
        testType: 'time',
        trainingMode: 'standard',
        wpm: 19,
        wrongChars: 2
      },
      { countStarted: true }
    );

    assert.equal(nextDashboard.started, 1);
    assert.equal(nextDashboard.completed, 1);
    assert.equal(nextDashboard.modes['30s'].started, 1);
    assert.equal(nextDashboard.modes['30s'].completed, 1);
    assert.equal(nextDashboard.modes['30s'].bestWpm, 19);
    assert.equal(nextDashboard.modes['30s'].bestAccuracy, 96);
    assert.equal(nextDashboard.estimatedWordsTyped, 9);
    assert.equal(nextDashboard.totalTypingSeconds, 30);
    assert.equal(nextDashboard.results.length, 1);
    assert.equal(nextDashboard.results[0].modeLabel, '30s');
  });

  it('normalizes missing aggregate totals from result history', () => {
    const resultHistory = [
      { correctChars: 25, elapsedSeconds: 15 },
      { correctChars: 10, elapsedSeconds: 20 }
    ];
    const dashboard = normalizeDashboard(null, resultHistory);

    assert.equal(dashboard.estimatedWordsTyped, 7);
    assert.equal(dashboard.totalTypingSeconds, 35);
    assert.deepEqual(dashboard.results, resultHistory);
  });
});
