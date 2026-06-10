import App from '../src/App.jsx';

const title = 'TypeCheck - Typing Speed Test';
const description =
  "Test typing speed, accuracy, mistakes, and progress with TypeCheck's focused keyboard practice and performance dashboard.";
const DEFAULT_SITE_URL = 'http://localhost:3000';

function getSiteUrl() {
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const siteUrl = /^https?:\/\//i.test(rawSiteUrl)
    ? rawSiteUrl
    : `https://${rawSiteUrl}`;

  try {
    return new URL(siteUrl.replace(/\/$/, ''));
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: siteUrl,
  title,
  description,
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title,
    description,
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'TypeCheck logo'
      }
    ],
    siteName: 'TypeCheck',
    type: 'website',
    url: siteUrl
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/logo.png']
  }
};

export default function Page() {
  return <App />;
}
