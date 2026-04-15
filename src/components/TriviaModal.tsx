"use client";

import { useState } from "react";
import { Question } from "@/lib/types";

interface Props {
  question: Question;
  headerLabel: string; // e.g. "POWER-UP BIBLE TRIVIA" or "LEVEL QUESTION 3/5"
  onResolve: (correct: boolean, given: string) => void;
}

export default function TriviaModal({ question, headerLabel, onResolve }: Props) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [resolvedCorrect, setResolvedCorrect] = useState<boolean | null>(null);

  function grade(answer: string): boolean {
    return answer.trim().toLowerCase() === question.answer.trim().toLowerCase();
  }

  function submit(answer: string) {
    const ok = grade(answer);
    setResolvedCorrect(ok);
    setTimeout(() => onResolve(ok, answer), 950);
  }

  return (
    <div style={overlay}>
      <div style={panel}>
        <div style={{ fontSize: 9, color: "#ffd447", background: "#0b1b3a", padding: 8, borderRadius: 4 }}>
          {headerLabel} · {question.points} PTS
        </div>
        <h2 style={{ fontSize: 14, margin: "16px 0 12px", color: "#ba0c2f" }}>
          {question.prompt}
        </h2>

        {question.type === "multiple_choice" && question.choices ? (
          <div style={{ display: "grid", gap: 8 }}>
            {question.choices.map((c) => {
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
                  {c}
                </button>
              );
            })}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (resolvedCorrect !== null) return;
              submit(text);
            }}
          >
            <input
              autoFocus
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: "100%", padding: 12, fontSize: 14 }}
              disabled={resolvedCorrect !== null}
            />
            <button
              type="submit"
              className="btn-red"
              style={{ marginTop: 10 }}
              disabled={resolvedCorrect !== null}
            >
              SUBMIT
            </button>
          </form>
        )}

        {resolvedCorrect !== null && (
          <div
            style={{
              marginTop: 14,
              padding: 10,
              background: resolvedCorrect ? "#dcefe0" : "#fde2e2",
              border: `2px solid ${resolvedCorrect ? "#2a7a43" : "#a52020"}`,
              fontSize: 10,
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
  borderRadius: 8,
  boxShadow: "8px 8px 0 #ba0c2f",
  padding: 22,
  maxWidth: 540,
  width: "100%",
};
