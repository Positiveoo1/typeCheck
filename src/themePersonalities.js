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
  },
  {
    id: 'ember',
    label: 'Ember',
    description: 'Smoked red, warm keys, steady glow.',
    colors: ['#1f1411', '#ff6b35', '#ffd166'],
    defaultAccent: '#ff6b35',
    resultMotion: 'spark',
    soundStyle: 'bright',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'aurora',
    label: 'Aurora',
    description: 'Northern teal, violet pulse, glassy finish.',
    colors: ['#0b1720', '#4ecdc4', '#a78bfa'],
    defaultAccent: '#4ecdc4',
    resultMotion: 'bloom',
    soundStyle: 'soft',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'sakura',
    label: 'Sakura',
    description: 'Petal pink, soft paper, gentle taps.',
    colors: ['#fff1f6', '#f472b6', '#8b5cf6'],
    defaultAccent: '#f472b6',
    resultMotion: 'lift',
    soundStyle: 'soft',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'cobalt',
    label: 'Cobalt',
    description: 'Deep blue, bright cyan, clean response.',
    colors: ['#081525', '#38bdf8', '#3b82f6'],
    defaultAccent: '#38bdf8',
    resultMotion: 'comet',
    soundStyle: 'click',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'citrus',
    label: 'Citrus',
    description: 'Fresh yellow-green, snappy, high contrast.',
    colors: ['#11160c', '#a3e635', '#facc15'],
    defaultAccent: '#a3e635',
    resultMotion: 'scan',
    soundStyle: 'bright',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'lagoon',
    label: 'Lagoon',
    description: 'Blue-green calm, rounded caret, soft keys.',
    colors: ['#071c1d', '#14b8a6', '#67e8f9'],
    defaultAccent: '#14b8a6',
    resultMotion: 'bloom',
    soundStyle: 'soft',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'violet',
    label: 'Violet',
    description: 'Electric purple, crisp tone, neon finish.',
    colors: ['#171024', '#8b5cf6', '#f0abfc'],
    defaultAccent: '#8b5cf6',
    resultMotion: 'comet',
    soundStyle: 'bright',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'mono',
    label: 'Mono',
    description: 'Graphite surface, white focus, quiet typing.',
    colors: ['#111827', '#e5e7eb', '#94a3b8'],
    defaultAccent: '#e5e7eb',
    resultMotion: 'lift',
    soundStyle: 'soft',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'copper',
    label: 'Copper',
    description: 'Burnished metal, amber caret, solid click.',
    colors: ['#1f1712', '#f97316', '#f59e0b'],
    defaultAccent: '#f97316',
    resultMotion: 'spark',
    soundStyle: 'click',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'mint',
    label: 'Mint',
    description: 'Fresh mint, airy panels, relaxed keys.',
    colors: ['#effaf4', '#10b981', '#0f766e'],
    defaultAccent: '#10b981',
    resultMotion: 'bloom',
    soundStyle: 'soft',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'plum',
    label: 'Plum',
    description: 'Dark berry, magenta flash, bright chime.',
    colors: ['#211127', '#d946ef', '#fb7185'],
    defaultAccent: '#d946ef',
    resultMotion: 'spark',
    soundStyle: 'bright',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'skyline',
    label: 'Skyline',
    description: 'Pale blue, slate text, precise feedback.',
    colors: ['#eaf6ff', '#0ea5e9', '#475569'],
    defaultAccent: '#0ea5e9',
    resultMotion: 'lift',
    soundStyle: 'click',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'ruby',
    label: 'Ruby',
    description: 'Dark red, hot pink caret, bold results.',
    colors: ['#220d14', '#ef4444', '#f43f5e'],
    defaultAccent: '#ef4444',
    resultMotion: 'spark',
    soundStyle: 'bright',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep water, cyan trail, cool rhythm.',
    colors: ['#061826', '#06b6d4', '#22d3ee'],
    defaultAccent: '#06b6d4',
    resultMotion: 'comet',
    soundStyle: 'soft',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Evergreen base, lime highlight, grounded feel.',
    colors: ['#0d1f16', '#22c55e', '#84cc16'],
    defaultAccent: '#22c55e',
    resultMotion: 'bloom',
    soundStyle: 'soft',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'sunset',
    label: 'Sunset',
    description: 'Coral warmth, gold accents, lively typing.',
    colors: ['#24111a', '#fb7185', '#fbbf24'],
    defaultAccent: '#fb7185',
    resultMotion: 'spark',
    soundStyle: 'bright',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'ice',
    label: 'Ice',
    description: 'Cool white, blue caret, crisp motion.',
    colors: ['#f1f8ff', '#60a5fa', '#06b6d4'],
    defaultAccent: '#60a5fa',
    resultMotion: 'comet',
    soundStyle: 'click',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'neon',
    label: 'Neon',
    description: 'Blacklight green, pink spark, fast response.',
    colors: ['#08090d', '#39ff88', '#ff2bd6'],
    defaultAccent: '#39ff88',
    resultMotion: 'scan',
    soundStyle: 'bright',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'lavender',
    label: 'Lavender',
    description: 'Soft lavender, calm contrast, mellow sound.',
    colors: ['#f5f0ff', '#8b5cf6', '#64748b'],
    defaultAccent: '#8b5cf6',
    resultMotion: 'lift',
    soundStyle: 'soft',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
    }
  },
  {
    id: 'espresso',
    label: 'Espresso',
    description: 'Dark roast, cream text, caramel caret.',
    colors: ['#18110d', '#d97706', '#f5e7c6'],
    defaultAccent: '#d97706',
    resultMotion: 'lift',
    soundStyle: 'click',
    unlock: {
      label: 'Unlocked',
      isUnlocked: () => true
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
