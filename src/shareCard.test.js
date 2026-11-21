import assert from 'node:assert/strict';
import test from 'node:test';
import { buildShareText, getShareCardModel, getSparklinePoints } from './shareCard.js';

const result = {
  wpm: 86.6,
  accuracy: 95.7,
  rawWpm: 91.2,
  modeLabel: '30s',
  language: 'english',
  isPersonalBest: true,
  createdAt: '2026-03-04T10:00:00Z',
  speedHistory: [
    { elapsedSeconds: 0, wpm: 50 },
    { elapsedSeconds: 5, wpm: 90 },
    { elapsedSeconds: 10, wpm: 70 }
  ]
};

test('buildShareText formats the text version', () => {
  assert.equal(
    buildShareText(result),
    'I typed 87 WPM at 96% accuracy on TypeCheck (english 30s) ⌨️ https://type-check-taupe.vercel.app'
  );
});

test('buildShareText tolerates missing fields', () => {
  assert.match(buildShareText({}), /^I typed 0 WPM at 0% accuracy on TypeCheck \(english\)/);
});

test('getShareCardModel rounds values and merges theme colors', () => {
  const model = getShareCardModel(result, { themeColors: { accent: '#fff', bg: '' }, playerName: ' Sam ' });
  assert.equal(model.wpm, 87);
  assert.equal(model.accuracy, 96);
  assert.equal(model.rawWpm, 91);
  assert.equal(model.modeLabel, '30s');
  assert.equal(model.date, '2026-03-04');
  assert.equal(model.playerName, 'Sam');
  assert.equal(model.isPersonalBest, true);
  assert.equal(model.colors.accent, '#fff');
  assert.equal(model.colors.bg, '#10120f');
  assert.equal(model.siteUrl, 'type-check-taupe.vercel.app');
  assert.equal(model.sparkline.length, 3);
});

test('getSparklinePoints normalizes into the box', () => {
  const pts = getSparklinePoints(result.speedHistory, { width: 100, height: 10 });
  assert.deepEqual(pts[0], { x: 0, y: 10 });
  assert.deepEqual(pts[1], { x: 50, y: 0 });
  assert.equal(pts[2].x, 100);
  assert.deepEqual(getSparklinePoints([{ elapsedSeconds: 1, wpm: 5 }]), []);
  assert.deepEqual(getSparklinePoints(undefined), []);
});
