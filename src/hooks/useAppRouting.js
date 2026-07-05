import { useEffect, useState } from 'react';

const PAGE_PATHS = {
  dashboard: '/dashboard',
  leaderboard: '/leaderboard',
  privacy: '/privacy',
  profile: '/profile',
  settings: '/settings',
  terms: '/terms',
  test: '/'
};

function normalizePath(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '');
  return normalizedPath || '/';
}

function getHashPage(hash) {
  if (hash === '#dashboard') return 'dashboard';
  if (hash === '#leaderboard') return 'leaderboard';
  if (hash === '#profile') return 'profile';
  if (hash === '#settings') return 'settings';
  if (hash === '#privacy') return 'privacy';
  if (hash === '#terms') return 'terms';
  if (hash.startsWith('#player=')) return 'public-profile';

  return '';
}

function getPathPage(pathname) {
  const path = normalizePath(pathname);

  if (path === '/' || path === '/test') return 'test';
  if (path === '/dashboard') return 'dashboard';
  if (path === '/leaderboard') return 'leaderboard';
  if (path === '/profile') return 'profile';
  if (path === '/settings') return 'settings';
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  if (path.startsWith('/player/')) return 'public-profile';

  return 'test';
}

export function loadPage() {
  if (typeof window === 'undefined') return 'test';

  return getHashPage(window.location.hash) || getPathPage(window.location.pathname);
}

export function loadPublicProfileUserId() {
  if (typeof window === 'undefined') return '';
  if (window.location.hash.startsWith('#player=')) {
    return decodeURIComponent(window.location.hash.replace('#player=', ''));
  }

  const path = normalizePath(window.location.pathname);
  if (!path.startsWith('/player/')) return '';

  const encodedUserId = path.replace('/player/', '').split('/')[0];
  if (!encodedUserId) return '';

  return decodeURIComponent(encodedUserId);
}

export function getPathForPage(page, params = {}) {
  if (page === 'public-profile') {
    return params.userId ? `/player/${encodeURIComponent(params.userId)}` : '/leaderboard';
  }

  return PAGE_PATHS[page] || '/';
}

export function replaceLegacyHashRoute() {
  if (typeof window === 'undefined') return;

  const page = getHashPage(window.location.hash);
  if (!page) return;

  const path = getPathForPage(page, {
    userId: loadPublicProfileUserId()
  });
  window.history.replaceState({}, '', path);
}

export function pushPageRoute(page, params = {}) {
  if (typeof window === 'undefined') return;

  const path = getPathForPage(page, params);
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (currentPath !== path || window.location.hash) {
    window.history.pushState({}, '', path);
  }
}

export function useAppRouting() {
  const [currentPage, setCurrentPage] = useState('test');
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    replaceLegacyHashRoute();
    setCurrentPage(loadPage());
  }, []);

  useEffect(() => {
    setIsPageLoading(true);

    const timeoutId = window.setTimeout(() => {
      setIsPageLoading(false);
    }, 520);

    return () => window.clearTimeout(timeoutId);
  }, [currentPage]);

  useEffect(() => {
    const handleRouteChange = () => {
      replaceLegacyHashRoute();
      setCurrentPage(loadPage());
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return {
    currentPage,
    isPageLoading,
    setCurrentPage
  };
}
