import { motion } from 'framer-motion';
import { LEGAL_VERSION } from '../legal.js';

const LEGAL_CONTENT = {
  privacy: {
    eyebrow: 'privacy',
    title: 'Privacy Policy',
    version: LEGAL_VERSION,
    updated: 'Last updated: June 14, 2026',
    intro:
      'TypeCheck is built to measure typing performance and save progress for signed-in users. This policy explains what information is used and why.',
    sections: [
      {
        title: 'Information we collect',
        body:
          'When you sign in, we may store your email, display name, username, public profile details you choose to add, typing results, leaderboard results, and account activity timestamps.'
      },
      {
        title: 'How we use information',
        body:
          'We use this information to show your profile, save your dashboard, rank eligible leaderboard results, load public player profiles, and keep the app working reliably.'
      },
      {
        title: 'Public information',
        body:
          'Leaderboard entries and public profiles can show your chosen username. If no username is set, TypeCheck may show the name available from your signed-in account.'
      },
      {
        title: 'Local settings',
        body:
          'Theme, onboarding, sound, and test settings may be saved in your browser local storage so the app remembers your preferences on the same device.'
      },
      {
        title: 'Data services',
        body:
          'TypeCheck uses Firebase services for authentication and cloud data storage. Firebase processes data according to Google Firebase policies and the project security rules.'
      },
      {
        title: 'Your choices',
        body:
          'You can update profile details from your profile page and sign out at any time. To request removal of stored account data, contact the TypeCheck project owner.'
      }
    ]
  },
  terms: {
    eyebrow: 'terms',
    title: 'Terms',
    version: LEGAL_VERSION,
    updated: 'Last updated: June 14, 2026',
    intro:
      'By using TypeCheck, you agree to use the app fairly and understand how typing results, profiles, and leaderboard features work.',
    sections: [
      {
        title: 'Use of the app',
        body:
          'TypeCheck is provided for typing practice, progress tracking, and leaderboard comparison. Do not misuse the app, attempt to bypass security rules, or interfere with other users.'
      },
      {
        title: 'Accounts and profiles',
        body:
          'You are responsible for the information you add to your profile. Keep usernames and profile details appropriate and do not impersonate another person.'
      },
      {
        title: 'Leaderboard results',
        body:
          'Leaderboard rankings are based on saved eligible typing results. Results may be removed or ignored if they appear abusive, automated, manipulated, or technically invalid.'
      },
      {
        title: 'Availability',
        body:
          'TypeCheck may change, pause, or remove features at any time. The app is provided as-is without a promise that it will always be available or error-free.'
      },
      {
        title: 'Responsibility',
        body:
          'Use TypeCheck at your own discretion. The app is not responsible for lost data, interrupted sessions, inaccurate results, or issues caused by browser, network, or third-party service problems.'
      },
      {
        title: 'Updates',
        body:
          'These terms may be updated as the app changes. Continued use of TypeCheck after updates means you accept the latest terms.'
      }
    ]
  }
};

function LegalPage({ type, onBack }) {
  const content = LEGAL_CONTENT[type] || LEGAL_CONTENT.privacy;

  return (
    <motion.main
      className="legal-page"
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <section className="legal-hero">
        <p className="eyebrow">{content.eyebrow}</p>
        <h2>
          {content.title}
          {type === 'terms' && (
            <span className="legal-version">v{content.version}</span>
          )}
        </h2>
        <span>{content.updated}</span>
      </section>

      <section className="legal-panel">
        <p className="legal-intro">{content.intro}</p>
        <div className="legal-sections">
          {content.sections.map((section) => (
            <article key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
        <button className="legal-back" onClick={onBack} type="button">
          Back to typing
        </button>
      </section>
    </motion.main>
  );
}

export default LegalPage;
