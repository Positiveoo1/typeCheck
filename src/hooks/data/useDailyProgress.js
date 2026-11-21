import { useEffect, useMemo, useState } from 'react';
import {
  getDailyProgress,
  getDayKey,
  loadCelebratedDay,
  saveCelebratedDay
} from '../../dailyProgress.js';

// Derives streak/goal progress from results and toasts once per day when the
// goal is met. `results` should be local history (optionally merged with cloud).
export function useDailyProgress({ goalType, goalValue, isReady, notify, results }) {
  // Re-evaluate at local midnight / when the tab regains focus.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const intervalId = window.setInterval(refresh, 60 * 1000);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const progress = useMemo(
    () => getDailyProgress(results, { type: goalType, value: goalValue }, now),
    [goalType, goalValue, now, results]
  );

  useEffect(() => {
    if (!isReady || !progress.met) return;

    const today = getDayKey(now);
    if (loadCelebratedDay() === today) return;

    saveCelebratedDay(today);
    notify({
      title: 'Daily goal reached',
      message:
        progress.currentStreak > 1
          ? `${progress.currentStreak} day streak. Nice work.`
          : 'Streak started. Come back tomorrow to keep it going.',
      type: 'success'
    });
  }, [isReady, notify, now, progress.currentStreak, progress.met]);

  return progress;
}
