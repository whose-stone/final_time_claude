"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { loadQuiz, recordQuizAttempt } from "@/lib/db";
import { Question, Quiz } from "@/lib/types";

// Questions Only Mode is the platform-free escape hatch. Two ways to land here:
//   1. From /start: a student who has piled up cumulative deaths can choose to
//      answer their assigned quiz in pure question form.
//   2. Auto-failsafe from /game: a student who dies RUN_DEATH_FAILSAFE times
//      during a single quiz run is dropped onto this page automatically with
//      `?failsafe=1` set and the already-answered question ids preserved in
//      sessionStorage. In failsafe mode the student earns no game points
//      (score = 0) — only the grade derived from correct/incorrect counts.
//
// In either case the student is shown every (still-unanswered) question on
// one page, picks an answer per question, and clicks "Submit Quiz" to record
// a single QuizAttempt entry against the gradebook.
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
  const isFailsafe = searchParams?.get("failsafe") === "1";

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [ready, setReady] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<null | {
    correct: number;
    incorrect: number;
    score: number;
  }>(null);
  const [startedAt] = useState<number>(Date.now());

  // The set of question ids the player already resolved during the
  // pre-failsafe game run. Stored in sessionStorage by the game page just
  // before the redirect. Empty (or missing) when the student arrived from
  // /start instead of from the failsafe path.
  const alreadyAnswered = useMemo<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = sessionStorage.getItem("questionsOnlyAnswered");
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as unknown;
      if (!Array.isArray(arr)) return new Set();
      return new Set(arr.filter((x): x is string => typeof x === "string"));
    } catch {
      return new Set();
    }
  }, []);

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

  const remainingQuestions: Question[] = useMemo(() => {
    if (!quiz) return [];
    return (quiz.questions || []).filter((q) => !alreadyAnswered.has(q.id));
  }, [quiz, alreadyAnswered]);

  const total = remainingQuestions.length;

  function pick(questionId: string, choice: string) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
  }

  async function submit() {
    if (!quiz || !player || submitting || submitted) return;
    const allAnswered = remainingQuestions.every((q) => answers[q.id] != null);
    if (!allAnswered) {
      const ok = window.confirm(
        "Some questions are unanswered. Submit anyway? Unanswered questions will count as incorrect.",
      );
      if (!ok) return;
    }
    setSubmitting(true);
    let correct = 0;
    let incorrect = 0;
    let score = 0;
    for (const q of remainingQuestions) {
      const given = answers[q.id];
      if (given && given.trim().toLowerCase() === q.answer.trim().toLowerCase()) {
        correct += 1;
        // Failsafe runs award no game points — only a graded attempt.
        if (!isFailsafe) score += q.points || 0;
      } else {
        incorrect += 1;
      }
    }
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
      // Clear the failsafe handoff so a later visit to this page from
      // /start doesn't reuse a stale answered-id list.
      try {
        sessionStorage.removeItem("questionsOnlyAnswered");
      } catch {
        /* ignore */
      }
      setResult({ correct, incorrect, score });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

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
        <div className="card" style={{ maxWidth: 520 }}>
          <h1 className="title" style={{ margin: 0 }}>
            NO QUESTIONS LEFT
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>
            {alreadyAnswered.size > 0
              ? "You already answered every question on this quiz during your run."
              : "This quiz has no questions yet."}
          </p>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn-red" onClick={() => router.replace("/start")}>
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (submitted && result) {
    const attempted = result.correct + result.incorrect;
    const pct = attempted > 0 ? (result.correct / attempted) * 100 : 0;
    return (
      <main className="center-screen">
        <div className="card" style={{ maxWidth: 520 }}>
          <h1 className="title" style={{ margin: 0 }}>
            QUIZ SUBMITTED
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>
            {result.correct} of {attempted} correct ({pct.toFixed(0)}%).
            {isFailsafe
              ? " No game points awarded — your grade has been recorded."
              : ` Score: ${result.score}.`}
          </p>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn-red" onClick={() => router.replace("/start")}>
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
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
            {isFailsafe
              ? "Auto Quiz Mode — answer the remaining questions to submit your grade"
              : "Questions Only Mode"}
          </p>
        </div>
        <button onClick={() => router.replace("/start")}>Exit</button>
      </div>

      {isFailsafe && (
        <div
          style={{
            background: "#faf3e0",
            border: "2px dashed #0b1b3a",
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          You hit the death limit during your run. You can finish this quiz on
          paper here. Submitting will record this as a graded attempt — no game
          points are awarded, only a grade based on how many questions you get
          right.
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ol style={{ display: "grid", gap: 16, paddingLeft: 22 }}>
          {remainingQuestions.map((q, idx) => (
            <li
              key={q.id}
              style={{
                background: "#fff",
                border: "3px solid #111",
                borderRadius: 6,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 1,
                  color: "#666",
                  marginBottom: 6,
                }}
              >
                QUESTION {idx + 1} OF {total} · LEVEL {q.level} · {q.points} PTS
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.4, marginBottom: 10 }}>
                {q.prompt}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {(q.choices ?? []).map((c, i) => {
                  const id = `${q.id}-c${i}`;
                  const checked = answers[q.id] === c;
                  return (
                    <label
                      key={id}
                      htmlFor={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        border: "2px solid #111",
                        borderRadius: 4,
                        background: checked ? "#ffd447" : "#faf3e0",
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      <input
                        id={id}
                        type="radio"
                        name={q.id}
                        value={c}
                        checked={checked}
                        onChange={() => pick(q.id, c)}
                      />
                      <span>{c}</span>
                    </label>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>

        <div
          className="btn-row"
          style={{ marginTop: 18, justifyContent: "flex-end" }}
        >
          <button
            type="submit"
            className="btn-red"
            disabled={submitting}
            style={{ fontSize: 16, padding: "12px 24px" }}
          >
            {submitting ? "Submitting…" : "Submit Quiz"}
          </button>
        </div>
      </form>
    </main>
  );
}
