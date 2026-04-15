"use client";

import { useCallback, useEffect, useState } from "react";
import { Question } from "@/lib/types";

interface Props {
  question: Question;
  headerLabel: string; // e.g. "POWER-UP BIBLE TRIVIA" or "LEVEL QUESTION 3/5"
  onResolve: (correct: boolean, given: string) => void;
}

export default function TriviaModal({ question, headerLabel, onResolve }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [resolvedCorrect, setResolvedCorrect] = useState<boolean | null>(null);

  function grade(answer: string): boolean {
    return answer.trim().toLowerCase() === question.answer.trim().toLowerCase();
  }

  const submit = useCallback(
    (answer: string) => {
      const ok = grade(answer);
      setResolvedCorrect(ok);
      setTimeout(() => onResolve(ok, answer), 950);
    },
    // grade is stable because it closes over `question` which is a prop,
    // but add it to the dep array for correctness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question, onResolve],
  );

  const choices = question.choices ?? [];

  // Keyboard shortcuts: 1/2/3/4 pick the corresponding answer without the
  // student having to move their hand to the mouse. Also accept the
  // numpad variants. The listener is disabled once the answer is locked
  // in so the 950ms feedback window can't be retriggered.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (resolvedCorrect !== null) return;
      const keyMap: Record<string, number> = {
        "1": 0,
        "2": 1,
        "3": 2,
        "4": 3,
        Numpad1: 0,
        Numpad2: 1,
        Numpad3: 2,
        Numpad4: 3,
      };
      const idx = keyMap[e.key] ?? keyMap[e.code];
      if (idx === undefined) return;
      const c = choices[idx];
      if (!c) return;
      e.preventDefault();
      setPicked(c);
      submit(c);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choices, resolvedCorrect, submit]);

  return (
    <div style={overlay}>
      <div style={panel}>
        <div
          style={{
            fontSize: 13,
            color: "#ffd447",
            background: "#0b1b3a",
            padding: 12,
            borderRadius: 6,
            letterSpacing: 1,
          }}
        >
          {headerLabel} · {question.points} PTS
        </div>
        <h2 style={{ fontSize: 22, lineHeight: 1.4, margin: "22px 0 18px", color: "#ba0c2f" }}>
          {question.prompt}
        </h2>

        <div style={{ display: "grid", gap: 12 }}>
          {choices.map((c, i) => {
            const isPicked = picked === c;
            const showCorrect = resolvedCorrect !== null && c === question.answer;
            const showWrong =
              resolvedCorrect === false && isPicked && c !== question.answer;
            return (
              <button
                key={c}
                onClick={() => {
                  if (resolvedCorrect !== null) return;
                  setPicked(c);
                  submit(c);
                }}
                disabled={resolvedCorrect !== null}
                style={{
                  textAlign: "left",
                  fontSize: 16,
                  lineHeight: 1.4,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: showCorrect
                    ? "#3ea35a"
                    : showWrong
                      ? "#c83232"
                      : isPicked
                        ? "#ffd447"
                        : "#faf3e0",
                  color: showCorrect || showWrong ? "white" : "#111",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    borderRadius: 4,
                    border: "2px solid #111",
                    background:
                      showCorrect || showWrong ? "rgba(255,255,255,0.25)" : "#fff",
                    color: showCorrect || showWrong ? "#fff" : "#0b1b3a",
                    fontSize: 13,
                    fontWeight: "bold",
                  }}
                >
                  {i + 1}
                </span>
                <span>{c}</span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 10,
            color: "#666",
            textAlign: "right",
            letterSpacing: 1,
          }}
        >
          TIP: PRESS 1 · 2 · 3 · 4 TO ANSWER
        </div>

        {resolvedCorrect !== null && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              background: resolvedCorrect ? "#dcefe0" : "#fde2e2",
              border: `3px solid ${resolvedCorrect ? "#2a7a43" : "#a52020"}`,
              borderRadius: 4,
              fontSize: 14,
              lineHeight: 1.4,
            }}
          >
            {resolvedCorrect
              ? "\u2713 Correct! Amen!"
              : `\u2717 Correct answer: ${question.answer}`}
          </div>
        )}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
  padding: 16,
};

const panel: React.CSSProperties = {
  background: "#fff",
  border: "4px solid #111",
  borderRadius: 10,
  boxShadow: "10px 10px 0 #ba0c2f",
  padding: 28,
  maxWidth: 620,
  width: "100%",
};
