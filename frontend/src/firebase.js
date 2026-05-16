import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  onAuthStateChanged
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const firebaseEnabled = hasConfig;
export const app = hasConfig ? initializeApp(firebaseConfig) : null;
export const auth = hasConfig ? getAuth(app) : null;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle() {
  if (!auth) {
    console.warn("Firebase not configured — using dev mock sign-in");
    return { uid: "dev-anonymous", displayName: "Demo Traveller", email: "demo@kupe.local" };
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    // Popup blocked → redirect flow
    console.warn("popup failed, falling back to redirect", err);
    await signInWithRedirect(auth, googleProvider);
    return null;
  }
}

export async function signOut() {
  if (auth) {
    await fbSignOut(auth);
  }
}

export function onUserChanged(cb) {
  if (!auth) {
    cb({ uid: "dev-anonymous", displayName: "Demo Traveller", email: "demo@kupe.local" });
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}
