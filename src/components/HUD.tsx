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
        margin: "0 auto 10px",
        background: "#0b1b3a",
        color: "#ffd447",
        border: "4px solid #111",
        borderRadius: 8,
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        fontSize: 18,
      }}
    >
      <HudItem label="GRADE" value={grade} big />
      <HudItem label="LEVEL" value={`${levelId} ${LEVEL_NAMES[levelId]}`} />
      <HudItem label="NEXT Q" value={`${Math.min(nextQuestion, totalQuestions)}/${totalQuestions}`} />
      <HudItem label="PRAYERS" value={`\uD83D\uDE4F x${prayers}`} />
      <HudItem
        label="LIVES"
        value={limitedLives ? `\u2764 x${Math.max(0, lives)}` : "\u221E"}
      />
      <HudItem label="SCORE" value={`${correct} / ${attempted}`} />
    </div>
  );
}

function HudItem({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 13, color: "#c8c8d8", letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: big ? 30 : 18, lineHeight: 1 }}>{value}</span>
    </div>
  );
}
