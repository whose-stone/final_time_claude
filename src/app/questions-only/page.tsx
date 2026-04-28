"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { loadQuiz, recordQuizAttempt } from "@/lib/db";
import { Question, Quiz } from "@/lib/types";
import TriviaModal from "@/components/TriviaModal";

// Questions Only Mode is the platform-free escape hatch we offer once a
// student has died more than QUESTIONS_ONLY_DEATH_THRESHOLD times. The
// student picks a quiz, walks through every question via the existing
// TriviaModal UI, and we record one quiz attempt at the end so the
// gradebook still has a row for them. No platforming, no gargoyles, no
// boss — just the questions.
export default function QuestionsOnlyPage() {
  return (
    <Suspense
      fallback={
        <main className="center-screen">
          <div className="card">Loading questions...</div>
        </main>
      }
    >
      <QuestionsOnlyInner />
    </Suspense>
  );
}

function QuestionsOnlyInner() {
  const { user, player, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = searchParams?.get("quizId") || null;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [startedAt] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!quizId) {
      router.replace("/start");
      return;
    }
    (async () => {
      const q = await loadQuiz(quizId);
      setQuiz(q);
      setReady(true);
    })();
  }, [user, loading, quizId, router]);

  const questions: Question[] = useMemo(
    () => (quiz?.questions || []).slice(),
    [quiz],
  );
  const total = questions.length;
  const finished = ready && total > 0 && index >= total;

  // Once the student has answered every question, record one quiz attempt
  // and bounce them back to /start. Guarded by `submitted` so an unmount
  // mid-write doesn't double-record.
  useEffect(() => {
    if (!finished || submitted || submitting || !player || !quiz) return;
    setSubmitting(true);
    (async () => {
      const completedAt = Date.now();
      const isLate = quiz.dueDate > 0 && completedAt > quiz.dueDate;
      try {
        await recordQuizAttempt(player.uid, {
          quizId: quiz.id,
          startedAt,
          completedAt,
          score,
          correct,
          incorrect,
          gargoylesDefeated: 0,
          timeSeconds: Math.round((completedAt - startedAt) / 1000),
          isLate,
        });
      } finally {
        setSubmitted(true);
        setSubmitting(false);
      }
    })();
  }, [finished, submitted, submitting, player, quiz, score, correct, incorrect, startedAt]);

  if (loading || !ready) {
    return (
      <main className="center-screen">
        <div className="card">Loading questions...</div>
      </main>
    );
  }

  if (!quiz) {
    return (
      <main className="center-screen">
        <div className="card">
          <p>Quiz not found.</p>
          <button className="btn-red" onClick={() => router.replace("/start")}>
            Back
          </button>
        </div>
      </main>
    );
  }

  if (total === 0) {
    return (
      <main className="center-screen">
        <div className="card">
          <p>This quiz has no questions yet.</p>
          <button className="btn-red" onClick={() => router.replace("/start")}>
            Back
          </button>
        </div>
      </main>
    );
  }

  if (finished) {
    const attempted = correct + incorrect;
    const pct = attempted > 0 ? (correct / attempted) * 100 : 0;
    return (
      <main className="center-screen">
        <div className="card" style={{ maxWidth: 520 }}>
          <h1 className="title" style={{ margin: 0 }}>
            QUIZ COMPLETE
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>
            Nice work — {correct} of {attempted} correct ({pct.toFixed(0)}%).
            Score: {score}.
          </p>
          {submitting && (
            <p style={{ fontSize: 13, color: "#666" }}>Submitting…</p>
          )}
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button
              className="btn-red"
              onClick={() => router.replace("/start")}
              disabled={submitting}
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  const q = questions[index];

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div>
          <h1 className="title" style={{ margin: 0, fontSize: 22 }}>
            {quiz.name}
          </h1>
          <p className="subtitle" style={{ margin: "4px 0 0", fontSize: 13 }}>
            Questions Only Mode
          </p>
        </div>
        <button onClick={() => router.replace("/start")}>Exit</button>
      </div>

      <div
        style={{
          background: "#fff",
          border: "3px solid #111",
          borderRadius: 6,
          padding: "10px 14px",
          marginBottom: 12,
          fontSize: 13,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span>
          Question {index + 1} / {total}
        </span>
        <span>✓ {correct}</span>
        <span>✗ {incorrect}</span>
        <span>Score {score}</span>
      </div>

      <TriviaModal
        key={q.id}
        question={q}
        headerLabel={`QUESTION ${index + 1} / ${total}`}
        onResolve={(ok) => {
          if (ok) {
            setCorrect((c) => c + 1);
            setScore((s) => s + (q.points || 0));
          } else {
            setIncorrect((c) => c + 1);
          }
          setIndex((i) => i + 1);
        }}
      />
    </main>
  );
}
