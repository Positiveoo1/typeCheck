export const THEME_PERSONALITIES = [
  {
    id: 'matrix',
    label: 'Matrix',
    description: 'Sharp glow, bright click, terminal pulse.',
    colors: ['#10120f', '#b9dc6d', '#d6ca62'],
    defaultAccent: '#b9dc6d',
    resultMotion: 'scan',
    soundStyle: 'bright',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'serika',
    label: 'Serika',
    description: 'Warm paper, soft key tone, calm finish.',
    colors: ['#e1dcc9', '#d0a542', '#2f3329'],
    defaultAccent: '#6f8b3d',
    resultMotion: 'lift',
    soundStyle: 'soft',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'botanical',
    label: 'Botanical',
    description: 'Leafy glow, rounded caret, quiet keys.',
    colors: ['#102019', '#72d49a', '#e4d66c'],
    defaultAccent: '#72d49a',
    resultMotion: 'bloom',
    soundStyle: 'soft',
    unlock: {
      label: 'Complete 5 tests',
      isUnlocked: ({ completed = 0 }) => completed >= 5
    }
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Blue trail, crisp tone, comet result.',
    colors: ['#0c1020', '#76a9ff', '#f0c86a'],
    defaultAccent: '#76a9ff',
    resultMotion: 'comet',
    soundStyle: 'click',
    unlock: {
      label: 'Reach 70 WPM',
      isUnlocked: ({ bestWpm = 0 }) => bestWpm >= 70
    }
  },
  {
    id: 'rose',
    label: 'Rose',
    description: 'Soft flash, bright chime, celebratory pop.',
    colors: ['#21151b', '#ff8fab', '#f6d365'],
    defaultAccent: '#ff8fab',
    resultMotion: 'spark',
    soundStyle: 'bright',
    unlock: {
      label: 'Reach 98% accuracy',
      isUnlocked: ({ bestAccuracy = 0 }) => bestAccuracy >= 98
    }
  }
];

export const ACCENT_COLORS = [
  '#b9dc6d',
  '#72d49a',
  '#76a9ff',
  '#f0c86a',
  '#ff8fab',
  '#d0a542'
];

export function getThemePersonality(themeId) {
  return (
    THEME_PERSONALITIES.find((theme) => theme.id === themeId) ||
    THEME_PERSONALITIES[0]
  );
}

export function getThemeIds() {
  return THEME_PERSONALITIES.map((theme) => theme.id);
}

export function getDashboardThemeStats(dashboard = {}) {
  const modes = Object.values(dashboard.modes || {});
  const results = dashboard.results || [];

  return {
    bestAccuracy: Math.max(
      ...modes.map((mode) => Number(mode.bestAccuracy) || 0),
      ...results.map((result) => Number(result.accuracy) || 0),
      0
    ),
    bestWpm: Math.max(
      ...modes.map((mode) => Number(mode.bestWpm) || 0),
      ...results.map((result) => Number(result.wpm) || 0),
      0
    ),
    completed: Number(dashboard.completed) || results.length || 0
  };
}

export function getUnlockedThemeIds(dashboard = {}) {
  const stats = getDashboardThemeStats(dashboard);

  return THEME_PERSONALITIES
    .filter((theme) => theme.unlock.isUnlocked(stats))
    .map((theme) => theme.id);
}

export function hexToRgbParts(hex) {
  const normalizedHex = String(hex || '').trim();
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalizedHex);

  if (!match) return null;

  return [
    Number.parseInt(match[1], 16),
    Number.parseInt(match[2], 16),
    Number.parseInt(match[3], 16)
  ];
}

export function normalizeAccentColor(value, fallback = '') {
  const rgbParts = hexToRgbParts(value);

  return rgbParts ? `#${rgbParts.map((part) => part.toString(16).padStart(2, '0')).join('')}` : fallback;
}
