"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  User,
} from "firebase/auth";
import { getAdminEmails, getFirebase } from "@/lib/firebase";
import { loadPlayer, newPlayerState, savePlayer } from "@/lib/db";
import { PlayerState } from "@/lib/types";

interface AuthCtx {
  user: User | null;
  player: PlayerState | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPlayer: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { auth } = getFirebase();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        let p = await loadPlayer(u.uid);
        if (!p) {
          p = newPlayerState(u.uid, u.email || "");
          await savePlayer(p);
        }
        setPlayer(p);
      } else {
        setPlayer(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function signIn(email: string, password: string) {
    const { auth } = getFirebase();
    if (!auth) throw new Error("Firebase not configured");
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email: string, password: string) {
    const { auth } = getFirebase();
    if (!auth) throw new Error("Firebase not configured");
    await createUserWithEmailAndPassword(auth, email, password);
  }

  async function signInWithGoogle() {
    const { auth } = getFirebase();
    if (!auth) throw new Error("Firebase not configured");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  }

  async function logout() {
    const { auth } = getFirebase();
    if (!auth) return;
    await signOut(auth);
  }

  async function refreshPlayer() {
    if (!user) return;
    const p = await loadPlayer(user.uid);
    setPlayer(p);
  }

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const admins = getAdminEmails();
    if (player?.isAdmin) return true;
    if (user.email && admins.includes(user.email.toLowerCase())) return true;
    return false;
  }, [user, player]);

  const value: AuthCtx = {
    user,
    player,
    loading,
    isAdmin,
    signIn,
    signInWithGoogle,
    register,
    logout,
    refreshPlayer,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
