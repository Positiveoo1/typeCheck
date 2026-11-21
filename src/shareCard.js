export const SHARE_SITE_NAME = 'TypeCheck';
export const SHARE_SITE_URL = 'https://type-check-taupe.vercel.app';
export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

const FALLBACK_COLORS = {
  accent: '#cfc257',
  bg: '#10120f',
  heading: '#edf0df',
  muted: '#7f8575',
  panel: '#171a15',
  text: '#d5d8c9'
};

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/** Maps speedHistory into a width x height box (y grows downward, fastest at top). */
export function getSparklinePoints(speedHistory, { width = 1, height = 1 } = {}) {
  const samples = (Array.isArray(speedHistory) ? speedHistory : [])
    .map((entry) => ({ x: num(entry?.elapsedSeconds), y: num(entry?.wpm) }))
    .sort((a, b) => a.x - b.x);
  if (samples.length < 2) return [];

  const minX = samples[0].x;
  const maxX = samples[samples.length - 1].x;
  const minY = Math.min(...samples.map((s) => s.y));
  const maxY = Math.max(...samples.map((s) => s.y));
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  return samples.map((s) => ({
    x: ((s.x - minX) / spanX) * width,
    y: maxY === minY ? height / 2 : height - ((s.y - minY) / spanY) * height
  }));
}

export function getShareCardModel(result = {}, { themeColors = {}, playerName = '' } = {}) {
  const colors = { ...FALLBACK_COLORS };
  for (const [key, value] of Object.entries(themeColors || {})) {
    if (typeof value === 'string' && value.trim()) colors[key] = value.trim();
  }

  return {
    wpm: Math.round(num(result.wpm)),
    accuracy: Math.round(num(result.accuracy)),
    rawWpm: Math.round(num(result.rawWpm ?? result.wpm)),
    modeLabel: String(result.modeLabel || ''),
    language: String(result.language || 'english'),
    date: formatDate(result.createdAt),
    playerName: String(playerName || '').trim(),
    isPersonalBest: Boolean(result.isPersonalBest),
    sparkline: getSparklinePoints(result.speedHistory), // normalized 0..1 box
    siteName: SHARE_SITE_NAME,
    siteUrl: SHARE_SITE_URL.replace(/^https?:\/\//, ''),
    colors
  };
}

export function buildShareText(result = {}) {
  const wpm = Math.round(num(result.wpm));
  const accuracy = Math.round(num(result.accuracy));
  const dailyKey =
    result.dailyKey || String(result.modeLabel || '').match(/^daily (\d{4}-\d{2}-\d{2})$/)?.[1];
  if (result.trainingMode === 'daily' && dailyKey) {
    const rank = Number(result.dailyRank) > 0 ? `, rank #${result.dailyRank} today` : '';
    return `TypeCheck Daily ${dailyKey}: ${wpm} WPM at ${accuracy}% accuracy${rank} ⌨️ ${SHARE_SITE_URL}`;
  }
  const details = [result.language || 'english', result.modeLabel].filter(Boolean).join(' ');
  return `I typed ${wpm} WPM at ${accuracy}% accuracy on ${SHARE_SITE_NAME} (${details}) ⌨️ ${SHARE_SITE_URL}`;
}

/** DOM dependent: reads the active theme's CSS variables. */
export function readThemeColors(element = document.documentElement) {
  const style = getComputedStyle(element);
  const map = { bg: '--bg', panel: '--bg-soft', text: '--text', heading: '--heading', muted: '--muted', accent: '--accent' };
  const colors = {};
  for (const [key, variable] of Object.entries(map)) {
    const value = style.getPropertyValue(variable).trim();
    if (value) colors[key] = value;
  }
  return colors;
}

/** DOM dependent: draws the model onto a canvas as a 1200x630 card. */
export function renderShareCard(canvas, model) {
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  const c = model.colors;
  const font = 'Inter, ui-sans-serif, system-ui, sans-serif';

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);
  ctx.fillStyle = c.panel;
  ctx.fillRect(40, 40, SHARE_CARD_WIDTH - 80, SHARE_CARD_HEIGHT - 80);
  ctx.fillStyle = c.accent;
  ctx.fillRect(40, 40, 8, SHARE_CARD_HEIGHT - 80);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = c.heading;
  ctx.font = `700 36px ${font}`;
  ctx.fillText(model.siteName, 90, 112);
  if (model.isPersonalBest) {
    const label = 'PERSONAL BEST';
    ctx.font = `700 22px ${font}`;
    const w = ctx.measureText(label).width + 36;
    ctx.fillStyle = c.accent;
    ctx.fillRect(300, 80, w, 42);
    ctx.fillStyle = c.bg;
    ctx.fillText(label, 318, 110);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = c.muted;
  ctx.font = `500 24px ${font}`;
  ctx.fillText([model.playerName, model.date].filter(Boolean).join(' · '), SHARE_CARD_WIDTH - 90, 110);

  ctx.textAlign = 'left';
  ctx.fillStyle = c.accent;
  ctx.font = `800 190px ${font}`;
  ctx.fillText(String(model.wpm), 86, 320);
  const wpmWidth = ctx.measureText(String(model.wpm)).width;
  ctx.fillStyle = c.muted;
  ctx.font = `600 40px ${font}`;
  ctx.fillText('WPM', 106 + wpmWidth, 320);

  const stats = [
    ['accuracy', `${model.accuracy}%`],
    ['raw wpm', String(model.rawWpm)],
    ['mode', model.modeLabel || '-'],
    ['language', model.language]
  ];
  stats.forEach(([label, value], i) => {
    const x = 90 + i * 255;
    ctx.fillStyle = c.muted;
    ctx.font = `500 22px ${font}`;
    ctx.fillText(label, x, 385);
    ctx.fillStyle = c.heading;
    ctx.font = `700 34px ${font}`;
    ctx.fillText(value.length > 12 ? `${value.slice(0, 11)}…` : value, x, 428);
  });

  if (model.sparkline.length > 1) {
    const box = { x: 90, y: 465, w: SHARE_CARD_WIDTH - 180, h: 80 };
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    model.sparkline.forEach((p, i) => {
      const x = box.x + p.x * box.w;
      const y = box.y + p.y * box.h;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.stroke();
  }

  ctx.fillStyle = c.muted;
  ctx.font = `500 24px ${font}`;
  ctx.textAlign = 'right';
  ctx.fillText(model.siteUrl, SHARE_CARD_WIDTH - 90, 575);
  ctx.textAlign = 'left';
}
