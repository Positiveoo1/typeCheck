import type { MetadataRoute } from 'next';

const DEFAULT_SITE_URL = 'http://localhost:3000';
const STATIC_PAGES = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/dashboard', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/leaderboard', changeFrequency: 'daily', priority: 0.8 },
  { path: '/profile', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/settings', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 }
] as const;

function getSiteUrl() {
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const siteUrl = /^https?:\/\//i.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`;

  try {
    return new URL(siteUrl).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function getStaticPages(siteUrl: string): MetadataRoute.Sitemap {
  return STATIC_PAGES.map((page) => ({
    url: `${siteUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return getStaticPages(siteUrl);
}
