import { getApps, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig, {
  isFirebaseConfigured,
  recaptchaEnterpriseSiteKey
} from './firebaseConfig.js';

export { isFirebaseConfigured };

const APP_CHECK_INSTANCE_KEY = '__typecheckFirebaseAppCheck';

export const firebaseApp = isFirebaseConfigured
  ? getApps()[0] || initializeApp(firebaseConfig)
  : null;

function initializeFirebaseAppCheck(app) {
  if (!app || typeof window === 'undefined' || !recaptchaEnterpriseSiteKey) {
    return null;
  }

  if (window[APP_CHECK_INSTANCE_KEY]) {
    return window[APP_CHECK_INSTANCE_KEY];
  }

  try {
    window[APP_CHECK_INSTANCE_KEY] = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaEnterpriseSiteKey),
      isTokenAutoRefreshEnabled: true
    });

    return window[APP_CHECK_INSTANCE_KEY];
  } catch (error) {
    console.warn('Firebase App Check could not be initialized:', error);
    return null;
  }
}

export const appCheck = initializeFirebaseAppCheck(firebaseApp);
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
