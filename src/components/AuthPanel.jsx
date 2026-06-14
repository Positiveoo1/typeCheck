import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../services/firebase.js';

const LEGAL_VERSION = '2026-06-14';

function getFriendlyError(error) {
  if (!error?.code) return 'Something went wrong. Try again.';

  const messages = {
    'auth/email-already-in-use': 'This email already has an account.',
    'auth/configuration-not-found': 'Firebase Auth is not fully configured.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/missing-password': 'Enter a password.',
    'auth/operation-not-allowed': 'Enable Email/Password sign-in in Firebase.',
    'auth/popup-closed-by-user': 'Sign in was closed before finishing.',
    'auth/weak-password': 'Password should be at least 6 characters.'
  };

  return messages[error.code] || `${error.code}: ${error.message}`;
}

function AuthPanel({
  className = 'auth-panel',
  message = '',
  onClose,
  onSuccess
}) {
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isRegisterMode = mode === 'register';

  const saveLegalConsent = async (signedInUser) => {
    if (!db || !signedInUser) return;

    await setDoc(
      doc(db, 'users', signedInUser.uid),
      {
        email: signedInUser.email || null,
        legalAcceptedAt: serverTimestamp(),
        privacyAcceptedAt: serverTimestamp(),
        privacyVersion: LEGAL_VERSION,
        termsAcceptedAt: serverTimestamp(),
        termsVersion: LEGAL_VERSION
      },
      { merge: true }
    );
  };

  const requireLegalConsent = () => {
    if (hasAcceptedLegal) return false;

    setError('Please accept the Terms and Privacy Policy before continuing.');
    return true;
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (isRegisterMode && requireLegalConsent()) return;

    setIsLoading(true);

    try {
      if (mode === 'register') {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await saveLegalConsent(credential.user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (authError) {
      console.error('Email authentication failed:', authError);
      setError(getFriendlyError(authError));
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError('');

    if (isRegisterMode && requireLegalConsent()) return;

    setIsLoading(true);

    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());

      if (isRegisterMode) {
        await saveLegalConsent(credential.user);
      }

      onSuccess();
    } catch (authError) {
      console.error('Google authentication failed:', authError);
      setError(getFriendlyError(authError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {!isFirebaseConfigured ? (
        <p className="auth-note">
          Add Firebase environment variables to enable accounts.
        </p>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          {message && <p className="auth-note">{message}</p>}

          <div className="auth-panel-top">
            <div className="auth-tabs" role="tablist" aria-label="Account mode">
              <button
                className={mode === 'sign-in' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => {
                  setError('');
                  setMode('sign-in');
                }}
                type="button"
              >
                Sign in
              </button>
              <button
                className={mode === 'register' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => {
                  setError('');
                  setMode('register');
                }}
                type="button"
              >
                Register
              </button>
            </div>
            <button
              aria-label="Close account panel"
              className="auth-close"
              onClick={onClose}
              type="button"
            >
              x
            </button>
          </div>

          <input
            aria-label="Email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email"
            type="email"
            value={email}
          />
          <input
            aria-label="Password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="password"
            type="password"
            value={password}
          />
          {isRegisterMode && (
            <label className="auth-consent">
              <input
                checked={hasAcceptedLegal}
                onChange={(event) => setHasAcceptedLegal(event.target.checked)}
                type="checkbox"
              />
              <span>
                I agree to the <a href="#terms" onClick={onClose}>Terms</a> and{' '}
                <a href="#privacy" onClick={onClose}>Privacy Policy</a>.
              </span>
            </label>
          )}
          <motion.button
            className="auth-submit"
            disabled={isLoading || (isRegisterMode && !hasAcceptedLegal)}
            type="submit"
            whileHover={
              isLoading || (isRegisterMode && !hasAcceptedLegal)
                ? undefined
                : { y: -1, scale: 1.02 }
            }
            whileTap={
              isLoading || (isRegisterMode && !hasAcceptedLegal)
                ? undefined
                : { scale: 0.95 }
            }
          >
            {isLoading ? 'Working...' : mode === 'register' ? 'Create' : 'Enter'}
          </motion.button>

          <div className="auth-divider">
            <span />
          </div>

          <motion.button
            className="google-submit"
            disabled={isLoading || (isRegisterMode && !hasAcceptedLegal)}
            onClick={signInWithGoogle}
            type="button"
            whileHover={
              isLoading || (isRegisterMode && !hasAcceptedLegal)
                ? undefined
                : { y: -1, scale: 1.02 }
            }
            whileTap={
              isLoading || (isRegisterMode && !hasAcceptedLegal)
                ? undefined
                : { scale: 0.95 }
            }
          >
            Continue with Google
          </motion.button>

          {error && <p className="auth-error">{error}</p>}
        </form>
      )}
    </motion.section>
  );
}

export default AuthPanel;
