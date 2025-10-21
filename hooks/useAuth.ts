// hooks/useAuth.ts
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { useFirebase } from "./useFirebase";

export function useAuthState() {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, [auth]);

  return { user, initializing };
}

export function useAuthActions() {
  const { auth } = useFirebase();

  const login = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email.trim(), password);

  const signup = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email.trim(), password);

  const logout = () => signOut(auth);

  return { login, signup, logout };
}
