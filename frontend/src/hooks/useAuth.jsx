import { createContext, useContext, useEffect, useState } from "react";
import { firebaseEnabled, onUserChanged, signInWithGoogle, signOut } from "../firebase.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onUserChanged((u) => {
      setUser(u);
      setReady(true);
    });
    return () => (typeof unsub === "function" ? unsub() : undefined);
  }, []);

  const value = {
    user,
    ready,
    firebaseEnabled,
    signIn: signInWithGoogle,
    signOut,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
