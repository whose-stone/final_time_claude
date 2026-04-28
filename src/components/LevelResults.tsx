"use client";

import { letterGrade, LEVEL_NAMES, LevelId } from "@/lib/types";

interface Props {
  level: LevelId;
  correct: number;
  incorrect: number;
  gargoylesDefeated: number;
  score: number;
  timeSeconds: number;
  isBoss?: boolean;
  onContinue: () => void;
  onReplay: () => void;
  onExit: () => void;
}

export default function LevelResults(p: Props) {
  const attempted = p.correct + p.incorrect;
  const pct = attempted > 0 ? (p.correct / attempted) * 100 : 0;
  const grade = letterGrade(pct);
  const isFinal = p.level === 5;

  return (
    <div style={overlay}>
      <div style={panel}>
        {p.isBoss ? (
          <>
            <h1 style={{ color: "#ba0c2f", fontSize: 28 }}>TEACHER DEFEATED!</h1>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>
              You vanquished the final homework-slinging teacher. He&rsquo;s sipping
              Diet Mountain Dew in peace. Congratulations, Firebird!
            </p>
          </>
        ) : (
          <>
            <h1 style={{ color: "#ba0c2f", fontSize: 28 }}>
              LEVEL {p.level} COMPLETE
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>{LEVEL_NAMES[p.level]} cleared!</p>
          </>
        )}

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            fontSize: 14,
          }}
        >
          <Stat label="Grade" value={grade} />
          <Stat label="Score" value={String(p.score)} />
          <Stat label="Correct" value={`${p.correct}/${attempted}`} />
          <Stat label="Gargoyles" value={String(p.gargoylesDefeated)} />
          <Stat label="Time" value={`${p.timeSeconds}s`} />
          <Stat label="Accuracy" value={`${pct.toFixed(0)}%`} />
        </div>

        <div className="btn-row" style={{ marginTop: 18 }}>
          {!isFinal && (
            <button className="btn-red" onClick={p.onContinue}>
              Next Level →
            </button>
          )}
          {isFinal && !p.isBoss && (
            <button className="btn-red" onClick={p.onContinue}>
              Finish Game
            </button>
          )}
          {p.isBoss && (
            <button className="btn-red" onClick={p.onContinue}>
              Finish Game
            </button>
          )}
          <button onClick={p.onReplay}>Replay Level</button>
          <button className="btn-navy" onClick={p.onExit}>
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#faf3e0",
        border: "2px solid #111",
        borderRadius: 6,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 11, color: "#666", letterSpacing: 1 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 16, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
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
