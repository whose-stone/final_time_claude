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

        {question.type === "multiple_choice" && question.choices ? (
          <div style={{ display: "grid", gap: 12 }}>
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
                    fontSize: 16,
                    lineHeight: 1.4,
                    padding: "14px 16px",
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
              style={{ width: "100%", padding: 16, fontSize: 18 }}
              disabled={resolvedCorrect !== null}
            />
            <button
              type="submit"
              className="btn-red"
              style={{ marginTop: 14, fontSize: 15, padding: "14px 20px" }}
              disabled={resolvedCorrect !== null}
            >
              SUBMIT
            </button>
          </form>
        )}

        {resolvedCorrect !== null && (
          <div
            style={{
              marginTop: 18,
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
