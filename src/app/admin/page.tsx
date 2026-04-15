"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  deleteQuestion,
  listPlayers,
  loadGameConfig,
  loadQuestions,
  resetPlayer,
  saveGameConfig,
  saveQuestion,
  seedQuestionsIfEmpty,
  updatePlayer,
} from "@/lib/db";
import {
  DEFAULT_CONFIG,
  GameConfig,
  LEVEL_NAMES,
  LevelConfig,
  LevelId,
  letterGrade,
  PlayerState,
  Question,
} from "@/lib/types";
import { downloadPlayerPdf } from "@/lib/pdf";

type Tab = "players" | "questions" | "config";

export default function AdminPage() {
  const { user, isAdmin, loading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("players");
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/");
    else if (!isAdmin) router.replace("/game");
  }, [user, isAdmin, loading, router]);

  async function refreshAll() {
    setLoadingData(true);
    try {
      await seedQuestionsIfEmpty();
      const [ps, qs, cfg] = await Promise.all([
        listPlayers(),
        loadQuestions(),
        loadGameConfig(),
      ]);
      setPlayers(ps);
      setQuestions(qs);
      setConfig(cfg);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (isAdmin) refreshAll();
  }, [isAdmin]);

  if (loading || !user || !isAdmin) {
    return (
      <main className="center-screen">
        <div className="card">Checking admin access...</div>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <h1 className="title" style={{ margin: 0 }}>ADMIN PANEL</h1>
        <div className="btn-row">
          <button onClick={refreshAll}>Refresh</button>
          <button className="btn-navy" onClick={() => logout().then(() => router.replace("/"))}>
            Sign out
          </button>
        </div>
      </div>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button
          className={tab === "players" ? "btn-red" : ""}
          onClick={() => setTab("players")}
        >
          Players ({players.length})
        </button>
        <button
          className={tab === "questions" ? "btn-red" : ""}
          onClick={() => setTab("questions")}
        >
          Questions ({questions.length})
        </button>
        <button
          className={tab === "config" ? "btn-red" : ""}
          onClick={() => setTab("config")}
        >
          Game Config
        </button>
      </div>

      {loadingData && <p>Loading data...</p>}

      {tab === "players" && (
        <PlayersPanel players={players} onReload={refreshAll} />
      )}
      {tab === "questions" && (
        <QuestionsPanel
          questions={questions}
          onReload={refreshAll}
          defaultPoints={config.defaultPointsPerQuestion}
        />
      )}
      {tab === "config" && (
        <ConfigPanel config={config} onSave={async (c) => {
          await saveGameConfig(c);
          await refreshAll();
        }} />
      )}
    </main>
  );
}

// ---------------- Players ----------------
function PlayersPanel({
  players,
  onReload,
}: {
  players: PlayerState[];
  onReload: () => Promise<void>;
}) {
  const [editingScore, setEditingScore] = useState<{ uid: string; score: string } | null>(null);

  async function handleReset(uid: string) {
    if (!confirm("Reset this player's game state? All progress will be cleared.")) return;
    await resetPlayer(uid);
    await onReload();
  }

  async function handleSaveScore(p: PlayerState) {
    if (!editingScore) return;
    const s = parseInt(editingScore.score, 10);
    if (isNaN(s)) return;
    await updatePlayer(p.uid, { totalScore: s });
    setEditingScore(null);
    await onReload();
  }

  if (players.length === 0) {
    return <p style={{ fontSize: 10 }}>No players yet. Students will appear here after they sign up and begin playing.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Character</th>
            <th>Level</th>
            <th>Checkpoint</th>
            <th>Score</th>
            <th>Grade</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {players
            .slice()
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((p) => {
              const totals = (p.levelResults || []).reduce(
                (acc, r) => ({
                  correct: acc.correct + r.correct,
                  attempts: acc.attempts + r.correct + r.incorrect,
                }),
                { correct: 0, attempts: 0 },
              );
              const pct = totals.attempts > 0 ? (totals.correct / totals.attempts) * 100 : 0;
              const grade = totals.attempts > 0 ? letterGrade(pct) : "—";
              return (
                <tr key={p.uid}>
                  <td>{p.email}</td>
                  <td>{p.character ?? "—"}</td>
                  <td>{LEVEL_NAMES[p.currentLevel]} (#{p.currentLevel})</td>
                  <td>
                    L{p.checkpointLevel} · Q{p.checkpointQuestionIndex}
                  </td>
                  <td>
                    {editingScore?.uid === p.uid ? (
                      <>
                        <input
                          style={{ width: 80 }}
                          value={editingScore.score}
                          onChange={(e) => setEditingScore({ ...editingScore, score: e.target.value })}
                        />
                        <button style={{ marginLeft: 6 }} onClick={() => handleSaveScore(p)}>
                          Save
                        </button>
                      </>
                    ) : (
                      <span
                        style={{ cursor: "pointer", textDecoration: "underline" }}
                        onClick={() => setEditingScore({ uid: p.uid, score: String(p.totalScore) })}
                      >
                        {p.totalScore}
                      </span>
                    )}
                  </td>
                  <td>{grade}</td>
                  <td>
                    <div className="btn-row">
                      <button onClick={() => downloadPlayerPdf(p)}>PDF</button>
                      <button className="btn-navy" onClick={() => handleReset(p.uid)}>
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Questions ----------------
function QuestionsPanel({
  questions,
  onReload,
  defaultPoints,
}: {
  questions: Question[];
  onReload: () => Promise<void>;
  defaultPoints: number;
}) {
  const [editing, setEditing] = useState<Question | null>(null);
  const [filterLevel, setFilterLevel] = useState<LevelId | 0>(0);

  function blank(): Question {
    return {
      id: `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      level: filterLevel || 1,
      type: "multiple_choice",
      prompt: "",
      choices: ["", "", "", ""],
      answer: "",
      points: defaultPoints,
    };
  }

  async function handleSave() {
    if (!editing) return;
    if (editing.type === "multiple_choice") {
      const cleaned = (editing.choices || []).map((c) => c.trim()).filter(Boolean);
      if (cleaned.length < 2) {
        alert("Multiple choice questions need at least 2 choices.");
        return;
      }
      if (!cleaned.includes(editing.answer)) {
        alert("Answer must match one of the choices exactly.");
        return;
      }
      editing.choices = cleaned;
    }
    await saveQuestion(editing);
    setEditing(null);
    await onReload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question?")) return;
    await deleteQuestion(id);
    await onReload();
  }

  const filtered = filterLevel === 0 ? questions : questions.filter((q) => q.level === filterLevel);

  return (
    <>
      <div className="btn-row" style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10 }}>Level:</label>
        <select value={filterLevel} onChange={(e) => setFilterLevel(parseInt(e.target.value, 10) as 0 | LevelId)}>
          <option value={0}>All</option>
          {([1, 2, 3, 4, 5] as LevelId[]).map((l) => (
            <option key={l} value={l}>
              {l}. {LEVEL_NAMES[l]}
            </option>
          ))}
        </select>
        <button className="btn-red" onClick={() => setEditing(blank())}>
          + Add Question
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th>Level</th>
              <th>Type</th>
              <th>Prompt</th>
              <th>Answer</th>
              <th>Points</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => (
              <tr key={q.id}>
                <td>{q.level}. {LEVEL_NAMES[q.level]}</td>
                <td>{q.type === "multiple_choice" ? "MC" : "Text"}</td>
                <td style={{ maxWidth: 400 }}>{q.prompt}</td>
                <td>{q.answer}</td>
                <td>{q.points}</td>
                <td>
                  <div className="btn-row">
                    <button onClick={() => setEditing({ ...q, choices: q.choices ?? ["", "", "", ""] })}>
                      Edit
                    </button>
                    <button className="btn-navy" onClick={() => handleDelete(q.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <QuestionEditor
          question={editing}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}

function QuestionEditor({
  question,
  onChange,
  onCancel,
  onSave,
}: {
  question: Question;
  onChange: (q: Question) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
}) {
  return (
    <div style={overlay}>
      <div style={{ ...panel, maxWidth: 620 }}>
        <h2 className="title" style={{ fontSize: 18 }}>EDIT QUESTION</h2>
        <div style={{ display: "grid", gap: 10, fontSize: 10 }}>
          <Row label="Level">
            <select
              value={question.level}
              onChange={(e) => onChange({ ...question, level: parseInt(e.target.value, 10) as LevelId })}
            >
              {([1, 2, 3, 4, 5] as LevelId[]).map((l) => (
                <option key={l} value={l}>{l}. {LEVEL_NAMES[l]}</option>
              ))}
            </select>
          </Row>
          <Row label="Type">
            <select
              value={question.type}
              onChange={(e) =>
                onChange({
                  ...question,
                  type: e.target.value as Question["type"],
                  choices: e.target.value === "multiple_choice" ? (question.choices ?? ["", "", "", ""]) : undefined,
                })
              }
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="text">Text Response</option>
            </select>
          </Row>
          <Row label="Prompt">
            <textarea
              rows={3}
              value={question.prompt}
              onChange={(e) => onChange({ ...question, prompt: e.target.value })}
            />
          </Row>
          {question.type === "multiple_choice" && (
            <>
              {(question.choices ?? ["", "", "", ""]).map((c, i) => (
                <Row key={i} label={`Choice ${i + 1}`}>
                  <input
                    value={c}
                    onChange={(e) => {
                      const arr = [...(question.choices ?? ["", "", "", ""])];
                      arr[i] = e.target.value;
                      onChange({ ...question, choices: arr });
                    }}
                  />
                </Row>
              ))}
              <Row label="Correct Answer">
                <select
                  value={question.answer}
                  onChange={(e) => onChange({ ...question, answer: e.target.value })}
                >
                  <option value="">-- pick one --</option>
                  {(question.choices ?? []).filter(Boolean).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Row>
            </>
          )}
          {question.type === "text" && (
            <Row label="Accepted Answer">
              <input
                value={question.answer}
                onChange={(e) => onChange({ ...question, answer: e.target.value })}
              />
            </Row>
          )}
          <Row label="Points">
            <input
              type="number"
              value={question.points}
              onChange={(e) => onChange({ ...question, points: parseInt(e.target.value, 10) || 0 })}
            />
          </Row>
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn-red" onClick={onSave}>
            Save
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Config ----------------
function ConfigPanel({
  config,
  onSave,
}: {
  config: GameConfig;
  onSave: (c: GameConfig) => Promise<void>;
}) {
  const [cfg, setCfg] = useState<GameConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => setCfg(config), [config]);

  function updateLevel(level: LevelId, patch: Partial<LevelConfig>) {
    setCfg({
      ...cfg,
      levels: { ...cfg.levels, [level]: { ...cfg.levels[level], ...patch } },
    });
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(cfg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16, fontSize: 10 }}>
      <div
        style={{
          background: "#fff",
          border: "3px solid #111",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Global Settings</h3>
        <Row label="Limited Lives">
          <input
            type="checkbox"
            checked={cfg.limitedLives}
            onChange={(e) => setCfg({ ...cfg, limitedLives: e.target.checked })}
          />
        </Row>
        <Row label="Starting Lives">
          <input
            type="number"
            min={1}
            max={9}
            value={cfg.startingLives}
            onChange={(e) =>
              setCfg({ ...cfg, startingLives: parseInt(e.target.value, 10) || 1 })
            }
          />
        </Row>
        <Row label="Default points per question">
          <input
            type="number"
            value={cfg.defaultPointsPerQuestion}
            onChange={(e) =>
              setCfg({
                ...cfg,
                defaultPointsPerQuestion: parseInt(e.target.value, 10) || 0,
              })
            }
          />
        </Row>
      </div>

      {([1, 2, 3, 4, 5] as LevelId[]).map((l) => {
        const lc = cfg.levels[l];
        return (
          <div
            key={l}
            style={{ background: "#fff", border: "3px solid #111", borderRadius: 8, padding: 16 }}
          >
            <h3 style={{ marginTop: 0 }}>
              Level {l} · {LEVEL_NAMES[l]}
            </h3>
            <Row label="Bible trivia power-ups">
              <input
                type="number"
                min={0}
                max={12}
                value={lc.triviaBibleCount}
                onChange={(e) =>
                  updateLevel(l, { triviaBibleCount: parseInt(e.target.value, 10) || 0 })
                }
              />
            </Row>
            <Row label="Gargoyles">
              <input
                type="number"
                min={0}
                max={30}
                value={lc.gargoyleCount}
                onChange={(e) =>
                  updateLevel(l, { gargoyleCount: parseInt(e.target.value, 10) || 0 })
                }
              />
            </Row>
            <Row label="Questions (pen pickups)">
              <input
                type="number"
                min={1}
                max={10}
                value={lc.questionCount}
                onChange={(e) =>
                  updateLevel(l, { questionCount: parseInt(e.target.value, 10) || 1 })
                }
              />
            </Row>
            <Row label="Points per question">
              <input
                type="number"
                value={lc.pointsPerQuestion}
                onChange={(e) =>
                  updateLevel(l, { pointsPerQuestion: parseInt(e.target.value, 10) || 0 })
                }
              />
            </Row>
          </div>
        );
      })}

      <div>
        <button className="btn-red" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Config"}
        </button>
      </div>
    </div>
  );
}

// ---------------- Shared bits ----------------
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
      }}
    >
      <label>{label}</label>
      {children}
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
  fontSize: 10,
  border: "3px solid #111",
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.65)",
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
  padding: 20,
  maxWidth: 600,
  width: "100%",
  maxHeight: "90vh",
  overflow: "auto",
};
