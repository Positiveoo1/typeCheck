export const DEFAULT_MODE_FILTER = '10 words';
export const CATEGORY_FILTERS = [
  { id: 'all', label: 'all' },
  { id: 'time', label: 'time' },
  { id: 'words', label: 'words' }
];

export function formatLeaderboardDate(value) {
  if (!value) return 'Pending';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return 'Pending';

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function sortLeaderboardEntries(firstEntry, secondEntry) {
  return (
    secondEntry.wpm - firstEntry.wpm ||
    secondEntry.accuracy - firstEntry.accuracy ||
    new Date(secondEntry.createdAt || 0) - new Date(firstEntry.createdAt || 0)
  );
}

export function getEntryTestType(entry) {
  if (entry.testType === 'time' || entry.testType === 'words') return entry.testType;

  return String(entry.modeLabel || '').includes('words') ? 'words' : 'time';
}

export function getModeOptions(entries) {
  const priority = ['15s', '30s', '60s', '10 words', '30 words', '60 words'];

  return [...new Set(entries.map((entry) => entry.modeLabel).filter(Boolean))].sort(
    (firstMode, secondMode) => {
      const firstPriority = priority.indexOf(firstMode);
      const secondPriority = priority.indexOf(secondMode);

      if (firstPriority !== -1 || secondPriority !== -1) {
        return (
          (firstPriority === -1 ? priority.length : firstPriority) -
          (secondPriority === -1 ? priority.length : secondPriority)
        );
      }

      return firstMode.localeCompare(secondMode);
    }
  );
}

export function getPlayerInitials(name) {
  const words = String(name || '')
    .replace(/^@/, '')
    .split(/[\s._-]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return '?';

  return words
    .slice(0, 2)
    .map((word) => word.slice(0, 1).toUpperCase())
    .join('');
}

export function getLeaderboardSummary(entries) {
  if (entries.length === 0) {
    return {
      averageAccuracy: 0,
      modeCount: 0,
      topWpm: 0,
      totalEntries: 0
    };
  }

  const accuracyTotal = entries.reduce(
    (total, entry) => total + Number(entry.accuracy || 0),
    0
  );

  return {
    averageAccuracy: Math.round(accuracyTotal / entries.length),
    modeCount: new Set(entries.map((entry) => entry.modeLabel).filter(Boolean)).size,
    topWpm: Math.max(...entries.map((entry) => Number(entry.wpm) || 0)),
    totalEntries: entries.length
  };
}
