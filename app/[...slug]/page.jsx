import { notFound } from 'next/navigation';
import App from '../../src/App.jsx';

const ROUTE_METADATA = {
  dashboard: {
    title: 'Dashboard - TypeCheck',
    description:
      'Review your TypeCheck typing progress, best runs, and saved performance history.'
  },
  leaderboard: {
    title: 'Leaderboard - TypeCheck',
    description: 'Compare public TypeCheck typing scores by mode, speed, and accuracy.'
  },
  player: {
    title: 'Player Profile - TypeCheck',
    description: 'View a public TypeCheck player profile and leaderboard results.'
  },
  privacy: {
    title: 'Privacy Policy - TypeCheck',
    description:
      'Read how TypeCheck handles account, profile, and typing performance data.'
  },
  profile: {
    title: 'Profile - TypeCheck',
    description: 'Manage your TypeCheck profile and account settings.'
  },
  settings: {
    title: 'Settings - TypeCheck',
    description:
      'Tune TypeCheck themes, sounds, keyboard display, and typing preferences.'
  },
  terms: {
    title: 'Terms - TypeCheck',
    description: 'Read the TypeCheck terms for using the typing speed test.'
  },
  test: {
    title: 'TypeCheck - Typing Speed Test',
    description: 'Test typing speed, accuracy, mistakes, and progress with TypeCheck.'
  }
};

function getRouteKey(slug = []) {
  const [firstSegment, secondSegment] = slug;

  if (firstSegment === 'player' && secondSegment) return 'player';
  if (firstSegment === 'test') return 'test';
  if (ROUTE_METADATA[firstSegment]) return firstSegment;

  return '';
}

async function getRouteKeyFromParams(params) {
  const resolvedParams = await params;

  return getRouteKey(resolvedParams.slug);
}

export async function generateMetadata({ params }) {
  const routeKey = await getRouteKeyFromParams(params);

  if (!routeKey) {
    return {};
  }

  return ROUTE_METADATA[routeKey];
}

export default async function RoutedPage({ params }) {
  const routeKey = await getRouteKeyFromParams(params);

  if (!routeKey) {
    notFound();
  }

  return <App />;
}
