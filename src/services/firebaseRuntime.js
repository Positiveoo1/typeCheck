export {
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signOut,
  updatePassword
} from 'firebase/auth';
export {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
export { auth, db, isFirebaseConfigured } from './firebase.js';
