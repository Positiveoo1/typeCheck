export function getPlayerInitials(name = 'Player') {
  const parts = String(name)
    .replace(/^@/, '')
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'P';

  return parts
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('');
}

export function getAverageAccuracy(results = []) {
  if (!results.length) return 0;

  return Math.round(
    results.reduce((total, result) => total + (Number(result.accuracy) || 0), 0) /
      results.length
  );
}

export function getAverageWpm(results = []) {
  if (!results.length) return 0;

  return Math.round(
    results.reduce((total, result) => total + (Number(result.wpm) || 0), 0) /
      results.length
  );
}

export function getConsistencyScore(results = []) {
  if (results.length < 2) return results.length === 1 ? 100 : 0;

  const averageWpm = getAverageWpm(results);
  if (averageWpm === 0) return 0;

  const variance =
    results.reduce((total, result) => {
      const distance = (Number(result.wpm) || 0) - averageWpm;
      return total + distance * distance;
    }, 0) / results.length;
  const deviation = Math.sqrt(variance);

  return Math.max(0, Math.min(100, Math.round(100 - (deviation / averageWpm) * 100)));
}

export function getTypingStyle(result = {}, context = {}) {
  const wpm = Number(result.wpm) || 0;
  const accuracy = Number(result.accuracy) || 0;
  const previousAverageWpm = Number(context.previousAverageWpm) || 0;
  const consistency = Number(context.consistency) || 0;

  if (accuracy >= 98 && wpm >= 60) {
    return {
      description: 'Fast and nearly flawless.',
      label: 'Sniper',
      tone: 'precision'
    };
  }

  if (wpm >= 90 && accuracy < 94) {
    return {
      description: 'Raw speed with room to clean up.',
      label: 'Sprinter',
      tone: 'speed'
    };
  }

  if (previousAverageWpm > 0 && wpm >= previousAverageWpm + 8) {
    return {
      description: 'Outpaced the recent baseline.',
      label: 'Climber',
      tone: 'growth'
    };
  }

  if (consistency >= 86 && accuracy >= 94) {
    return {
      description: 'Stable rhythm, low wobble.',
      label: 'Steady Hands',
      tone: 'steady'
    };
  }

  if (accuracy >= 96) {
    return {
      description: 'Accuracy-first control.',
      label: 'Precision',
      tone: 'precision'
    };
  }

  if (wpm >= 70) {
    return {
      description: 'Speed-led, still composed.',
      label: 'Tempo',
      tone: 'speed'
    };
  }

  return {
    description: 'Balanced speed and control.',
    label: 'Balanced',
    tone: 'balanced'
  };
}

export function getRankTier(bestWpm = 0) {
  const wpm = Number(bestWpm) || 0;

  if (wpm >= 120) return { label: 'Elite', level: 'S', progress: 100 };
  if (wpm >= 100) return { label: 'Diamond', level: 'A', progress: Math.round(((wpm - 100) / 20) * 100) };
  if (wpm >= 80) return { label: 'Gold', level: 'B', progress: Math.round(((wpm - 80) / 20) * 100) };
  if (wpm >= 60) return { label: 'Silver', level: 'C', progress: Math.round(((wpm - 60) / 20) * 100) };
  if (wpm >= 40) return { label: 'Bronze', level: 'D', progress: Math.round(((wpm - 40) / 20) * 100) };

  return { label: 'Rookie', level: 'E', progress: Math.round((wpm / 40) * 100) };
}

export function getAchievementBadges({
  bestAccuracy = 0,
  bestWpm = 0,
  completed = 0,
  consistency = 0,
  estimatedWords = 0,
  results = [],
  totalTypingSeconds = 0
} = {}) {
  const perfectRuns = results.filter((result) => Number(result.accuracy) >= 100).length;
  const recentPbShape = results.length >= 2 && Number(results[0].wpm) > Number(results[1].wpm);
  const badges = [
    {
      detail: 'Crossed 100 WPM.',
      id: 'century',
      isUnlocked: bestWpm >= 100,
      label: 'Century'
    },
    {
      detail: 'Finished a perfect run.',
      id: 'flawless',
      isUnlocked: bestAccuracy >= 100 || perfectRuns > 0,
      label: 'Flawless'
    },
    {
      detail: 'Finished 25 tests.',
      id: 'grinder',
      isUnlocked: completed >= 25 || results.length >= 25,
      label: 'Grinder'
    },
    {
      detail: 'Held an 85+ consistency score.',
      id: 'metronome',
      isUnlocked: consistency >= 85,
      label: 'Metronome'
    },
    {
      detail: 'Typed at least 2,000 estimated words.',
      id: 'wordsmith',
      isUnlocked: estimatedWords >= 2000,
      label: 'Wordsmith'
    },
    {
      detail: 'Practiced for at least one hour.',
      id: 'deep-work',
      isUnlocked: totalTypingSeconds >= 3600,
      label: 'Deep Work'
    },
    {
      detail: 'Recent run beat the previous one.',
      id: 'rising',
      isUnlocked: recentPbShape,
      label: 'Rising'
    }
  ];

  return badges.sort((first, second) => Number(second.isUnlocked) - Number(first.isUnlocked));
}
