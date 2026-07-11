const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const recaptchaEnterpriseSiteKey =
  process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY ||
  process.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ||
  '';

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

export const isRecaptchaEnterpriseConfigured = Boolean(recaptchaEnterpriseSiteKey);

export default firebaseConfig;
