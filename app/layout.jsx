import '../src/styles/base.css';
import '../src/styles/animations.css';
import '../src/styles/shared.css';
import '../src/styles/layout.css';
import '../src/styles/typing-test.css';
import '../src/styles/results.css';
import '../src/styles/dashboard.css';
import '../src/styles/leaderboard.css';
import '../src/styles/profile.css';
import '../src/styles/settings.css';
import '../src/styles/auth.css';
import '../src/styles/onboarding.css';

export const metadata = {
  title: 'TypeCheck',
  description: 'A simple beginner-friendly typing speed test built with Next.js.',
  icons: {
    icon: [
      {
        url: '/favicon.png',
        sizes: '64x64',
        type: 'image/png'
      }
    ]
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

export default RootLayout;