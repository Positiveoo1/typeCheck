import type { MetadataRoute } from 'next';

const DEFAULT_SITE_URL = 'http://localhost:3000';

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
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
