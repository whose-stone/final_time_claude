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
import { loadGameConfig, loadPlayer, newPlayerState, savePlayer } from "@/lib/db";
import { isEmailAllowed, PlayerState } from "@/lib/types";

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

  // The RTDB config node requires an authenticated read, so we can only
  // consult the admin's email allowlist AFTER creating the Firebase Auth
  // account. If the new account doesn't pass, delete it so nothing is
  // left behind and the same email can be re-used once the admin adds an
  // exemption or allowed domain.
  async function enforceEmailAllowlistForNewUser(
    createdUser: User,
    email: string,
  ) {
    const cfg = await loadGameConfig();
    if (isEmailAllowed(email, cfg)) return;
    try {
      await createdUser.delete();
    } catch {
      const { auth } = getFirebase();
      if (auth) await signOut(auth);
    }
    throw new Error(
      "This email address isn't authorized to register. Ask your teacher to add your domain or email to the allowed list.",
    );
  }

  async function register(email: string, password: string) {
    const { auth } = getFirebase();
    if (!auth) throw new Error("Firebase not configured");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await enforceEmailAllowlistForNewUser(cred.user, email);
  }

  async function signInWithGoogle() {
    const { auth } = getFirebase();
    if (!auth) throw new Error("Firebase not configured");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    // Only apply the allowlist to brand-new Google sign-ins. Existing
    // players keep access even if the admin later tightens the list.
    const existing = await loadPlayer(cred.user.uid);
    if (!existing) {
      await enforceEmailAllowlistForNewUser(cred.user, cred.user.email || "");
    }
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
