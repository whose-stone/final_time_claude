"use client";

import { letterGrade, LEVEL_NAMES, LevelId } from "@/lib/types";

interface Props {
  levelId: LevelId;
  prayers: number;
  lives: number;
  nextQuestion: number; // 1-indexed position of next question
  totalQuestions: number;
  correct: number;
  incorrect: number;
  limitedLives: boolean;
}

export default function HUD({
  levelId,
  prayers,
  lives,
  nextQuestion,
  totalQuestions,
  correct,
  incorrect,
  limitedLives,
}: Props) {
  const attempted = correct + incorrect;
  const percent = attempted > 0 ? (correct / attempted) * 100 : 100;
  const grade = letterGrade(percent);

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto 8px",
        background: "#0b1b3a",
        color: "#ffd447",
        border: "3px solid #111",
        borderRadius: 6,
        padding: "8px 12px",
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
        fontSize: 10,
      }}
    >
      <HudItem label="GRADE" value={grade} />
      <HudItem label="LVL" value={`${levelId} ${LEVEL_NAMES[levelId]}`} />
      <HudItem label="NEXT Q" value={`${Math.min(nextQuestion, totalQuestions)}/${totalQuestions}`} />
      <HudItem label="PRAYERS" value={`\uD83D\uDE4F x${prayers}`} />
      <HudItem
        label="LIVES"
        value={limitedLives ? `\u2764 x${Math.max(0, lives)}` : "∞"}
      />
      <HudItem label="SCORE" value={`${correct} / ${attempted}`} />
    </div>
  );
}

function HudItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 7, color: "#aaa" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
