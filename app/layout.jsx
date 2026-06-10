import '../src/styles.css';

export const metadata = {
  title: 'TypeCheck',
  description: 'A simple beginner-friendly typing speed test built with Next.js.',
  icons: {
    icon: '/logo.png'
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
