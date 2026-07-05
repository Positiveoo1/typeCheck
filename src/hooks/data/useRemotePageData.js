import { useEffect, useState } from 'react';
import {
  loadGlobalLeaderboard,
  loadPublicPlayerProfile
} from '../../services/typecheckData.js';
import { loadPublicProfileUserId } from '../app/useAppRouting.js';

const EMPTY_LEADERBOARD = {
  entries: [],
  error: '',
  isLoading: false
};

const EMPTY_PUBLIC_PROFILE = {
  error: '',
  isLoading: false,
  playerName: 'Player',
  results: [],
  userId: ''
};

export function useRemotePageData({ currentPage, notify }) {
  const [leaderboard, setLeaderboard] = useState(EMPTY_LEADERBOARD);
  const [publicProfile, setPublicProfile] = useState(EMPTY_PUBLIC_PROFILE);

  useEffect(() => {
    if (currentPage !== 'leaderboard') return undefined;

    let isSubscribed = true;
    setLeaderboard((currentLeaderboard) => ({
      ...currentLeaderboard,
      error: '',
      isLoading: true
    }));

    loadGlobalLeaderboard()
      .then((entries) => {
        if (!isSubscribed) return;

        setLeaderboard({
          entries,
          error: '',
          isLoading: false
        });
      })
      .catch((error) => {
        if (!isSubscribed) return;

        console.error('Failed to load leaderboard:', error);
        notify({
          title: 'Leaderboard unavailable',
          message: 'Could not load the latest public scores.',
          type: 'error'
        });
        setLeaderboard({
          entries: [],
          error: 'Could not load the leaderboard.',
          isLoading: false
        });
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentPage, notify]);

  useEffect(() => {
    if (currentPage !== 'public-profile') return undefined;

    const userId = loadPublicProfileUserId();

    if (!userId) {
      setPublicProfile({
        ...EMPTY_PUBLIC_PROFILE,
        error: 'Could not load this player profile.'
      });
      return undefined;
    }

    let isSubscribed = true;
    setPublicProfile((currentProfile) => ({
      ...currentProfile,
      error: '',
      isLoading: true,
      userId
    }));

    loadPublicPlayerProfile(userId)
      .then((nextProfile) => {
        if (!isSubscribed) return;

        setPublicProfile({
          ...nextProfile,
          isLoading: false,
          userId
        });
      })
      .catch((error) => {
        if (!isSubscribed) return;

        console.error('Failed to load public player profile:', error);
        notify({
          title: 'Profile unavailable',
          message: 'Could not load this public player profile.',
          type: 'error'
        });
        setPublicProfile({
          ...EMPTY_PUBLIC_PROFILE,
          error: 'Could not load this player profile.',
          userId
        });
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentPage, notify]);

  return {
    leaderboard,
    publicProfile
  };
}
