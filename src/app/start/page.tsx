"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { listQuizzes } from "@/lib/db";
import { LEVEL_NAMES, Quiz } from "@/lib/types";

// Student landing page after sign-in. Shows the quizzes the admin has
// assigned to this player with attempts-remaining + due-date status. Free
// play (the adventure without a quiz attached) is still available if the
// student has a character selected but no assigned quizzes yet.
export default function StartPage() {
  const { user, player, isAdmin, loading, logout } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (isAdmin) {
      router.replace("/admin");
      return;
    }
    if (player && !player.character) {
      router.replace("/character");
    }
  }, [user, player, isAdmin, loading, router]);

  useEffect(() => {
    if (!user || isAdmin) return;
    (async () => {
      setLoadingQuizzes(true);
      try {
        const all = await listQuizzes();
        setQuizzes(all);
      } finally {
        setLoadingQuizzes(false);
      }
    })();
  }, [user, isAdmin]);

  const assignedIds = useMemo(
    () => new Set(player?.assignedQuizIds || []),
    [player?.assignedQuizIds],
  );
  const myQuizzes = useMemo(
    () => quizzes.filter((q) => assignedIds.has(q.id)),
    [quizzes, assignedIds],
  );

  if (loading || !user || !player) {
    return (
      <main className="center-screen">
        <div className="card">Loading...</div>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 840, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div>
          <h1 className="title" style={{ margin: 0 }}>YOUR QUIZZES</h1>
          <p className="subtitle" style={{ margin: "6px 0 0" }}>
            {player.email}
          </p>
        </div>
        <div className="btn-row">
          <button
            className="btn-navy"
            onClick={() => logout().then(() => router.replace("/"))}
          >
            Sign out
          </button>
        </div>
      </div>

      {loadingQuizzes && <p>Loading quizzes...</p>}

      {!loadingQuizzes && myQuizzes.length === 0 && (
        <div
          style={{
            background: "#fff",
            border: "3px solid #111",
            borderRadius: 8,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            You don&apos;t have any quizzes assigned yet. Ask your teacher to
            assign you one, or jump into the adventure for free-play practice.
          </p>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button className="btn-red" onClick={() => router.push("/game")}>
              ▶ Free Play
            </button>
          </div>
        </div>
      )}

      {myQuizzes.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {myQuizzes.map((q) => (
            <QuizCard
              key={q.id}
              quiz={q}
              attemptsUsed={(player.quizAttempts?.[q.id] || []).length}
              onStart={() => router.push(`/game?quizId=${encodeURIComponent(q.id)}`)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function QuizCard({
  quiz,
  attemptsUsed,
  onStart,
}: {
  quiz: Quiz;
  attemptsUsed: number;
  onStart: () => void;
}) {
  const now = Date.now();
  const pastDue = quiz.dueDate > 0 && now > quiz.dueDate;
  const attemptsExhausted =
    quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts;
  const blocked = attemptsExhausted || (pastDue && !quiz.allowLate);

  const dueLabel =
    quiz.dueDate > 0
      ? `Due ${new Date(quiz.dueDate).toLocaleDateString()}`
      : "No due date";

  return (
    <div
      style={{
        background: "#fff",
        border: "3px solid #111",
        borderRadius: 8,
        padding: 18,
        boxShadow: "5px 5px 0 #ba0c2f",
        opacity: blocked ? 0.55 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20, color: "#ba0c2f" }}>{quiz.name}</h2>
        <div style={{ fontSize: 13, color: "#0b1b3a" }}>
          Level {quiz.level} · {LEVEL_NAMES[quiz.level]}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          marginTop: 12,
          fontSize: 13,
          color: "#333",
        }}
      >
        <span>📝 {quiz.questions?.length ?? 0} questions</span>
        <span>
          🎯 Attempt {attemptsUsed}
          {quiz.maxAttempts > 0 ? ` / ${quiz.maxAttempts}` : " / ∞"}
        </span>
        <span style={{ color: pastDue ? "#a52020" : "#333" }}>
          ⏰ {dueLabel}
          {pastDue && " (past due)"}
        </span>
        {pastDue && quiz.allowLate && (
          <span style={{ color: "#a88120" }}>late submissions allowed</span>
        )}
      </div>
      <div className="btn-row" style={{ marginTop: 16 }}>
        <button
          className="btn-red"
          disabled={blocked}
          onClick={onStart}
          title={
            attemptsExhausted
              ? "No attempts remaining"
              : blocked
                ? "Past due — late submissions are not allowed"
                : "Start this quiz"
          }
        >
          {blocked
            ? attemptsExhausted
              ? "No attempts left"
              : "Past due"
            : pastDue
              ? "▶ Start (late)"
              : "▶ Start Quiz"}
        </button>
      </div>
    </div>
  );
}
