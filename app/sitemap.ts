import type { MetadataRoute } from 'next';

const DEFAULT_SITE_URL = 'http://localhost:3000';
const DYNAMIC_ROUTE_SOURCES = [
  {
    basePath: '/menu',
    envName: 'SITEMAP_MENU_SLUGS_URL'
  },
  {
    basePath: '/blog',
    envName: 'SITEMAP_BLOG_SLUGS_URL'
  }
];

type SlugResponse =
  | string[]
  | {
      slugs?: string[];
      items?: Array<string | { slug?: string }>;
      data?: Array<string | { slug?: string }>;
    };

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

function getStaticPages(siteUrl: string): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1
    }
  ];
}

function normalizeSlugs(response: SlugResponse) {
  const rawItems = Array.isArray(response)
    ? response
    : response.slugs || response.items || response.data || [];

  return rawItems
    .map((item) => (typeof item === 'string' ? item : item.slug))
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => slug.replace(/^\/+|\/+$/g, ''));
}

async function fetchSlugs(endpoint?: string) {
  if (!endpoint) return [];

  try {
    const response = await fetch(endpoint, {
      next: { revalidate: 3600 }
    });

    if (!response.ok) return [];

    return normalizeSlugs((await response.json()) as SlugResponse);
  } catch {
    return [];
  }
}

async function getDynamicPages(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const groups = await Promise.all(
    DYNAMIC_ROUTE_SOURCES.map(async ({ basePath, envName }) => {
      const slugs = await fetchSlugs(process.env[envName]);

      return slugs.map((slug) => ({
        url: `${siteUrl}${basePath}/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7
      }));
    })
  );

  return groups.flat();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  return [...getStaticPages(siteUrl), ...(await getDynamicPages(siteUrl))];
}
