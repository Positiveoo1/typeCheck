import type { MetadataRoute } from 'next';

const DEFAULT_SITE_URL = 'http://localhost:3000';

function getSiteUrl() {
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const siteUrl = /^https?:\/\//i.test(rawSiteUrl)
    ? rawSiteUrl
    : `https://${rawSiteUrl}`;

  try {
    return new URL(siteUrl).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/private/']
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
