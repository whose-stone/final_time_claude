"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { user, isAdmin, player, signIn, register, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user || !player) return;
    if (isAdmin) router.replace("/admin");
    else if (!player.character) router.replace("/character");
    else router.replace("/game");
  }, [user, player, isAdmin, loading, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") await signIn(email, password);
      else await register(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="center-screen">
      <div className="card">
        <h1 className="title">FINAL TIME</h1>
        <p className="subtitle">
          Arizona Christian University — Firebirds Bible Trivia Adventure
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <div className="btn-row">
            <button type="submit" className="btn-red" disabled={submitting}>
              {submitting ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "New? Sign up" : "Have account? Sign in"}
            </button>
          </div>
        </form>

        <p style={{ fontSize: 9, marginTop: 18, color: "#555" }}>
          Students receive credentials from their teacher. Admins configure the
          game from the Admin Panel.
        </p>
      </div>
    </main>
  );
}
