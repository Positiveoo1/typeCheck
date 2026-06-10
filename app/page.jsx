import App from '../src/App.jsx';

const title = 'TypeCheck - Typing Speed Test';
const description =
  "Test typing speed, accuracy, mistakes, and progress with TypeCheck's focused keyboard practice and performance dashboard.";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(siteUrl),
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
    url: '/'
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
