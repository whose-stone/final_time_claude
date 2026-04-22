"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  assignQuizToPlayers,
  deletePlayer,
  deleteQuestion,
  deleteQuiz,
  listPlayers,
  listQuizzes,
  loadGameConfig,
  loadQuestions,
  reseedQuestions,
  resetPlayer,
  saveGameConfig,
  saveQuestion,
  saveQuiz,
  seedQuestionsIfEmpty,
  unassignQuizFromPlayers,
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
  QuestionCategory,
  Quiz,
} from "@/lib/types";
import { downloadPlayerPdf } from "@/lib/pdf";

type Tab = "players" | "quizzes" | "questions" | "config" | "playtest";

export default function AdminPage() {
  const { user, isAdmin, loading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("players");
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
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
      const [ps, qs, cfg, qz] = await Promise.all([
        listPlayers(),
        loadQuestions(),
        loadGameConfig(),
        listQuizzes(),
      ]);
      setPlayers(ps);
      setQuestions(qs);
      setConfig(cfg);
      setQuizzes(qz);
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
          className={tab === "quizzes" ? "btn-red" : ""}
          onClick={() => setTab("quizzes")}
        >
          Quizzes ({quizzes.length})
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
        <button
          className={tab === "playtest" ? "btn-red" : ""}
          onClick={() => setTab("playtest")}
        >
          Playtest
        </button>
      </div>

      {loadingData && <p>Loading data...</p>}

      {tab === "players" && (
        <PlayersPanel
          players={players}
          quizzes={quizzes}
          onReload={refreshAll}
        />
      )}
      {tab === "quizzes" && (
        <QuizzesPanel
          quizzes={quizzes}
          players={players}
          onReload={refreshAll}
          defaultPoints={config.defaultPointsPerQuestion}
        />
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
      {tab === "playtest" && <PlaytestPanel />}
    </main>
  );
}

// ---------------- Playtest ----------------
function PlaytestPanel() {
  const router = useRouter();
  const [level, setLevel] = useState<LevelId>(1);
  const [character, setCharacter] = useState<"boy" | "girl">("boy");

  function launch() {
    const params = new URLSearchParams({
      level: String(level),
      char: character,
      admin: "1",
    });
    router.push(`/game?${params.toString()}`);
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "3px solid #111",
        borderRadius: 8,
        padding: 20,
        maxWidth: 640,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Admin Playtest</h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "#333" }}>
        Jump directly into any level to test gameplay, boss fight, and
        question ordering. Admin playtest sessions bypass checkpoint
        saves so you can replay freely without overwriting student
        progress.
      </p>
      <div style={{ display: "grid", gap: 10, fontSize: 14, marginTop: 12 }}>
        <Row label="Level">
          <select
            value={level}
            onChange={(e) => setLevel(parseInt(e.target.value, 10) as LevelId)}
          >
            {([1, 2, 3, 4, 5] as LevelId[]).map((l) => (
              <option key={l} value={l}>
                {l}. {LEVEL_NAMES[l]}
                {l === 5 ? " (Boss)" : ""}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Character">
          <select
            value={character}
            onChange={(e) => setCharacter(e.target.value as "boy" | "girl")}
          >
            <option value="boy">Boy Firebird</option>
            <option value="girl">Girl Firebird</option>
          </select>
        </Row>
      </div>
      <div className="btn-row" style={{ marginTop: 16 }}>
        <button className="btn-red" onClick={launch}>
          ▶ Launch Playtest
        </button>
      </div>
    </div>
  );
}

// ---------------- Players ----------------
// Letter grade is derived from the player's quiz attempts ONLY — Bible
// trivia contributes to score but not to grade. We take each quiz's best
// attempt and average correct/attempts across all of them.
function playerQuizGrade(
  p: PlayerState,
): { grade: string; pct: number; scoreTotal: number; attemptCount: number } {
  const attemptsByQuiz = p.quizAttempts || {};
  let correct = 0;
  let attempts = 0;
  let scoreTotal = 0;
  let attemptCount = 0;
  for (const list of Object.values(attemptsByQuiz)) {
    if (!list || list.length === 0) continue;
    attemptCount += list.length;
    const best = list.reduce((a, b) => (b.score > a.score ? b : a));
    correct += best.correct;
    attempts += best.correct + best.incorrect;
    scoreTotal += best.score;
  }
  const pct = attempts > 0 ? (correct / attempts) * 100 : 0;
  const grade = attempts > 0 ? letterGrade(pct) : "—";
  return { grade, pct, scoreTotal, attemptCount };
}

function PlayersPanel({
  players,
  quizzes,
  onReload,
}: {
  players: PlayerState[];
  quizzes: Quiz[];
  onReload: () => Promise<void>;
}) {
  const [editingScore, setEditingScore] = useState<{ uid: string; score: string } | null>(null);
  const [assigningFor, setAssigningFor] = useState<PlayerState | null>(null);

  async function handleReset(uid: string) {
    if (
      !confirm(
        "Reset this player? This clears quiz assignments, all quiz attempts, score, checkpoint, and character selection.",
      )
    )
      return;
    await resetPlayer(uid);
    await onReload();
  }

  async function handleDelete(p: PlayerState) {
    if (
      !confirm(
        `Delete ${p.email}? Their RTDB record is removed entirely. Their Firebase Auth account is NOT deleted — they can sign back in and a fresh blank profile will be created.`,
      )
    )
      return;
    await deletePlayer(p.uid);
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
    return <p style={{ fontSize: 14 }}>No players yet. Students will appear here after they sign up and begin playing.</p>;
  }

  const quizById: Record<string, Quiz> = Object.fromEntries(
    quizzes.map((q) => [q.id, q]),
  );

  return (
    <>
      <div className="btn-row" style={{ marginBottom: 12 }}>
        <button onClick={() => downloadQuizScoresCsv(players, quizzes)}>
          ⬇ Download Quiz Scores CSV
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Character</th>
              <th>Assigned Quizzes</th>
              <th>Quiz Attempts</th>
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
                const g = playerQuizGrade(p);
                const assigned = p.assignedQuizIds || [];
                return (
                  <tr key={p.uid}>
                    <td>{p.email}</td>
                    <td>{p.character ?? "—"}</td>
                    <td style={{ maxWidth: 260 }}>
                      {assigned.length === 0 ? (
                        <span style={{ color: "#888" }}>— none —</span>
                      ) : (
                        assigned
                          .map((qid) => quizById[qid]?.name ?? `(deleted ${qid})`)
                          .join(", ")
                      )}
                    </td>
                    <td>{g.attemptCount}</td>
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
                    <td>{g.grade}</td>
                    <td>
                      <div className="btn-row">
                        <button onClick={() => setAssigningFor(p)}>Assign</button>
                        <button onClick={() => downloadPlayerPdf(p)}>PDF</button>
                        <button className="btn-navy" onClick={() => handleReset(p.uid)}>
                          Reset
                        </button>
                        <button className="btn-red" onClick={() => handleDelete(p)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {assigningFor && (
        <AssignQuizzesToPlayerDialog
          player={assigningFor}
          quizzes={quizzes}
          onClose={() => setAssigningFor(null)}
          onSaved={async () => {
            setAssigningFor(null);
            await onReload();
          }}
        />
      )}
    </>
  );
}

// Emit a CSV that contains one row per (player × quiz-attempt). Admins use
// this as the gradebook export — the columns are stable so it can be
// pasted into LMS imports. Bible trivia isn't attributable to a specific
// quiz so it never appears here; its score contribution already lives in
// the per-attempt `score` column.
function downloadQuizScoresCsv(players: PlayerState[], quizzes: Quiz[]) {
  const quizById: Record<string, Quiz> = Object.fromEntries(
    quizzes.map((q) => [q.id, q]),
  );
  const header = [
    "email",
    "quiz_id",
    "quiz_name",
    "level",
    "attempt_index",
    "attempt_number",
    "score",
    "correct",
    "incorrect",
    "accuracy_pct",
    "letter_grade",
    "is_late",
    "completed_at_iso",
  ];
  const rows: string[][] = [];
  for (const p of players) {
    const attempts = p.quizAttempts || {};
    for (const [quizId, list] of Object.entries(attempts)) {
      const quizName = quizById[quizId]?.name ?? "(deleted quiz)";
      const level = String(quizById[quizId]?.level ?? "");
      list.forEach((a, i) => {
        const attempted = a.correct + a.incorrect;
        const pct = attempted > 0 ? (a.correct / attempted) * 100 : 0;
        rows.push([
          p.email,
          quizId,
          quizName,
          level,
          String(i),
          String(i + 1),
          String(a.score),
          String(a.correct),
          String(a.incorrect),
          pct.toFixed(1),
          attempted > 0 ? letterGrade(pct) : "",
          a.isLate ? "true" : "false",
          new Date(a.completedAt).toISOString(),
        ]);
      });
    }
  }
  const csv = [header, ...rows]
    .map((r) => r.map(csvEscape).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quiz-scores-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function AssignQuizzesToPlayerDialog({
  player,
  quizzes,
  onClose,
  onSaved,
}: {
  player: PlayerState;
  quizzes: Quiz[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(player.assignedQuizIds || []),
  );
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const prev = new Set(player.assignedQuizIds || []);
      const next = selected;
      const toAssign = [...next].filter((id) => !prev.has(id));
      const toUnassign = [...prev].filter((id) => !next.has(id));
      await Promise.all([
        ...toAssign.map((qid) => assignQuizToPlayers(qid, [player.uid])),
        ...toUnassign.map((qid) => unassignQuizFromPlayers(qid, [player.uid])),
      ]);
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlay}>
      <div style={{ ...panel, maxWidth: 520 }}>
        <h2 className="title" style={{ fontSize: 22 }}>ASSIGN QUIZZES</h2>
        <p style={{ fontSize: 13, color: "#555" }}>{player.email}</p>
        {quizzes.length === 0 ? (
          <p style={{ fontSize: 13 }}>
            No quizzes exist yet. Create one on the Quizzes tab first.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {quizzes.map((q) => (
              <label
                key={q.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  padding: "8px 10px",
                  border: "2px solid #111",
                  borderRadius: 6,
                  background: selected.has(q.id) ? "#fff3cc" : "#fff",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(q.id)}
                  onChange={() => toggle(q.id)}
                />
                <span style={{ flex: 1 }}>
                  {q.name} · L{q.level} · {q.questions?.length ?? 0} Qs
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="btn-row" style={{ marginTop: 18 }}>
          <button className="btn-red" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Quizzes ----------------

function blankQuiz(defaultPoints: number): Quiz {
  return {
    id: `quiz-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: "New Quiz",
    level: 1,
    maxAttempts: 1,
    dueDate: 0,
    allowLate: false,
    questions: [
      {
        id: `q-${Date.now()}-1`,
        level: 1,
        category: "test",
        type: "multiple_choice",
        prompt: "",
        choices: ["", "", "", ""],
        answer: "",
        points: defaultPoints,
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  };
}

function QuizzesPanel({
  quizzes,
  players,
  onReload,
  defaultPoints,
}: {
  quizzes: Quiz[];
  players: PlayerState[];
  onReload: () => Promise<void>;
  defaultPoints: number;
}) {
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [assigning, setAssigning] = useState<Quiz | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleDelete(q: Quiz) {
    if (
      !confirm(
        `Delete quiz "${q.name}"? It will be removed from every player's assigned-quiz list. Past attempt records remain in player data but become orphaned.`,
      )
    )
      return;
    await deleteQuiz(q.id);
    await onReload();
  }

  async function handleSave(q: Quiz) {
    const cleaned: Quiz = {
      ...q,
      name: q.name.trim() || "Untitled Quiz",
      questions: (q.questions || []).map((qq, i) => ({
        ...qq,
        id: qq.id || `${q.id}-q-${i}`,
        level: q.level,
        category: "test",
        choices: (qq.choices || []).map((c) => c.trim()).filter(Boolean),
      })),
    };
    const bad = cleaned.questions.findIndex(
      (qq) => !qq.prompt.trim() || (qq.choices || []).length < 2 || !(qq.choices || []).includes(qq.answer),
    );
    if (bad >= 0) {
      alert(
        `Question ${bad + 1} is incomplete — needs a prompt, at least 2 non-empty choices, and an answer that matches one of them.`,
      );
      return;
    }
    await saveQuiz(cleaned);
    setEditing(null);
    await onReload();
  }

  const assignedCount = (quizId: string) =>
    players.filter((p) => (p.assignedQuizIds || []).includes(quizId)).length;

  return (
    <>
      <div className="btn-row" style={{ marginBottom: 12 }}>
        <button
          className="btn-red"
          onClick={() => setEditing(blankQuiz(defaultPoints))}
        >
          + New Quiz
        </button>
        <button onClick={() => setImporting(true)}>📋 Import JSON</button>
      </div>

      {quizzes.length === 0 && (
        <p style={{ fontSize: 14 }}>
          No quizzes yet. Create one manually or import a JSON file with embedded questions.
        </p>
      )}

      {quizzes.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Level</th>
                <th>Qs</th>
                <th>Max Attempts</th>
                <th>Due</th>
                <th>Late?</th>
                <th>Assigned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((q) => (
                <tr key={q.id}>
                  <td>{q.name}</td>
                  <td>
                    {q.level}. {LEVEL_NAMES[q.level]}
                  </td>
                  <td>{q.questions?.length ?? 0}</td>
                  <td>{q.maxAttempts > 0 ? q.maxAttempts : "∞"}</td>
                  <td>
                    {q.dueDate > 0
                      ? new Date(q.dueDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>{q.allowLate ? "yes" : "no"}</td>
                  <td>{assignedCount(q.id)}</td>
                  <td>
                    <div className="btn-row">
                      <button onClick={() => setEditing(q)}>Edit</button>
                      <button onClick={() => setAssigning(q)}>Assign</button>
                      <button className="btn-red" onClick={() => handleDelete(q)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <QuizEditor
          quiz={editing}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={() => handleSave(editing)}
          defaultPoints={defaultPoints}
        />
      )}

      {assigning && (
        <AssignPlayersToQuizDialog
          quiz={assigning}
          players={players}
          onClose={() => setAssigning(null)}
          onSaved={async () => {
            setAssigning(null);
            await onReload();
          }}
        />
      )}

      {importing && (
        <QuizImportDialog
          defaultPoints={defaultPoints}
          onCancel={() => setImporting(false)}
          onImported={async () => {
            setImporting(false);
            await onReload();
          }}
        />
      )}
    </>
  );
}

function QuizEditor({
  quiz,
  onChange,
  onCancel,
  onSave,
  defaultPoints,
}: {
  quiz: Quiz;
  onChange: (q: Quiz) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  defaultPoints: number;
}) {
  const dueIso = quiz.dueDate > 0
    ? new Date(quiz.dueDate).toISOString().slice(0, 10)
    : "";

  function addQuestion() {
    onChange({
      ...quiz,
      questions: [
        ...(quiz.questions || []),
        {
          id: `q-${Date.now()}-${(quiz.questions || []).length}`,
          level: quiz.level,
          category: "test",
          type: "multiple_choice",
          prompt: "",
          choices: ["", "", "", ""],
          answer: "",
          points: defaultPoints,
        },
      ],
    });
  }

  function removeQuestion(i: number) {
    const qs = [...(quiz.questions || [])];
    qs.splice(i, 1);
    onChange({ ...quiz, questions: qs });
  }

  function updateQuestion(i: number, patch: Partial<Question>) {
    const qs = [...(quiz.questions || [])];
    qs[i] = { ...qs[i], ...patch };
    onChange({ ...quiz, questions: qs });
  }

  return (
    <div style={overlay}>
      <div style={{ ...panel, maxWidth: 720 }}>
        <h2 className="title" style={{ fontSize: 24 }}>EDIT QUIZ</h2>
        <div style={{ display: "grid", gap: 12, fontSize: 14 }}>
          <Row label="Name">
            <input
              value={quiz.name}
              onChange={(e) => onChange({ ...quiz, name: e.target.value })}
            />
          </Row>
          <Row label="Level">
            <select
              value={quiz.level}
              onChange={(e) =>
                onChange({ ...quiz, level: parseInt(e.target.value, 10) as LevelId })
              }
            >
              {([1, 2, 3, 4, 5] as LevelId[]).map((l) => (
                <option key={l} value={l}>
                  {l}. {LEVEL_NAMES[l]}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Max attempts (0 = unlimited)">
            <input
              type="number"
              min={0}
              value={quiz.maxAttempts}
              onChange={(e) =>
                onChange({ ...quiz, maxAttempts: parseInt(e.target.value, 10) || 0 })
              }
            />
          </Row>
          <Row label="Due date (blank = no due date)">
            <input
              type="date"
              value={dueIso}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...quiz,
                  dueDate: v ? new Date(v + "T23:59:59").getTime() : 0,
                });
              }}
            />
          </Row>
          <Row label="Allow late submissions">
            <input
              type="checkbox"
              checked={quiz.allowLate}
              onChange={(e) => onChange({ ...quiz, allowLate: e.target.checked })}
            />
          </Row>
        </div>

        <h3 style={{ marginTop: 22, fontSize: 18 }}>
          Questions ({quiz.questions?.length ?? 0})
        </h3>
        <div style={{ display: "grid", gap: 16, marginTop: 8 }}>
          {(quiz.questions || []).map((q, i) => (
            <div
              key={q.id}
              style={{
                border: "2px solid #111",
                borderRadius: 6,
                padding: 12,
                background: "#faf3e0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <strong style={{ fontSize: 14 }}>Q{i + 1}</strong>
                <button
                  className="btn-navy"
                  style={{ fontSize: 12, padding: "6px 10px" }}
                  onClick={() => removeQuestion(i)}
                >
                  Remove
                </button>
              </div>
              <Row label="Prompt">
                <textarea
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => updateQuestion(i, { prompt: e.target.value })}
                />
              </Row>
              {(q.choices ?? ["", "", "", ""]).map((c, ci) => (
                <Row key={ci} label={`Choice ${ci + 1}`}>
                  <input
                    value={c}
                    onChange={(e) => {
                      const arr = [...(q.choices ?? ["", "", "", ""])];
                      arr[ci] = e.target.value;
                      updateQuestion(i, { choices: arr });
                    }}
                  />
                </Row>
              ))}
              <Row label="Correct answer">
                <select
                  value={q.answer}
                  onChange={(e) => updateQuestion(i, { answer: e.target.value })}
                >
                  <option value="">-- pick one --</option>
                  {(q.choices ?? []).filter(Boolean).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="Points">
                <input
                  type="number"
                  value={q.points}
                  onChange={(e) =>
                    updateQuestion(i, { points: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </Row>
            </div>
          ))}
        </div>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button onClick={addQuestion}>+ Add Question</button>
        </div>

        <div className="btn-row" style={{ marginTop: 20 }}>
          <button className="btn-red" onClick={onSave}>
            Save Quiz
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AssignPlayersToQuizDialog({
  quiz,
  players,
  onClose,
  onSaved,
}: {
  quiz: Quiz;
  players: PlayerState[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(
      players.filter((p) => (p.assignedQuizIds || []).includes(quiz.id)).map((p) => p.uid),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const initial = new Set(
        players.filter((p) => (p.assignedQuizIds || []).includes(quiz.id)).map((p) => p.uid),
      );
      const toAssign = [...selected].filter((u) => !initial.has(u));
      const toUnassign = [...initial].filter((u) => !selected.has(u));
      if (toAssign.length > 0) await assignQuizToPlayers(quiz.id, toAssign);
      if (toUnassign.length > 0) await unassignQuizFromPlayers(quiz.id, toUnassign);
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  const visible = players.filter((p) =>
    p.email.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div style={overlay}>
      <div style={{ ...panel, maxWidth: 560 }}>
        <h2 className="title" style={{ fontSize: 22 }}>
          ASSIGN PLAYERS — {quiz.name}
        </h2>
        <input
          placeholder="Filter by email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />
        <div style={{ maxHeight: 340, overflowY: "auto", display: "grid", gap: 6 }}>
          {visible.length === 0 && (
            <p style={{ fontSize: 13, color: "#777" }}>No players match.</p>
          )}
          {visible.map((p) => (
            <label
              key={p.uid}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                padding: "8px 10px",
                border: "2px solid #111",
                borderRadius: 6,
                background: selected.has(p.uid) ? "#fff3cc" : "#fff",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(p.uid)}
                onChange={() => toggle(p.uid)}
              />
              <span style={{ flex: 1 }}>{p.email}</span>
            </label>
          ))}
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn-red" onClick={save} disabled={saving}>
            {saving ? "Saving..." : `Save (${selected.size} selected)`}
          </button>
          <button onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// JSON shape accepted by the quiz importer:
//   [
//     {
//       "name": "Week 3 Quiz",
//       "level": 2,
//       "maxAttempts": 2,
//       "dueDate": "2026-05-01",   // or ms epoch
//       "allowLate": false,
//       "questions": [
//         { "prompt": "...", "choices": [...], "answer": "...", "points": 10 },
//         ...
//       ]
//     }
//   ]
// Single quiz as a bare object also accepted.
interface QuizImportRow {
  id?: string;
  name?: string;
  level?: number;
  maxAttempts?: number;
  dueDate?: number | string;
  allowLate?: boolean;
  questions?: Array<{
    id?: string;
    prompt?: string;
    question?: string;
    choices?: unknown;
    options?: unknown;
    answer?: string;
    points?: number;
  }>;
}

function QuizImportDialog({
  defaultPoints,
  onCancel,
  onImported,
}: {
  defaultPoints: number;
  onCancel: () => void;
  onImported: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const sample = JSON.stringify(
    [
      {
        name: "Week 1 — Creation",
        level: 1,
        maxAttempts: 2,
        dueDate: "2026-05-15",
        allowLate: true,
        questions: [
          {
            prompt: "Who created the heavens and the earth?",
            choices: ["God", "A king", "A wizard", "Nobody"],
            answer: "God",
            points: 20,
          },
          {
            prompt: "What was the name of the first man?",
            choices: ["Noah", "Adam", "Moses", "David"],
            answer: "Adam",
            points: 20,
          },
        ],
      },
    ],
    null,
    2,
  );

  async function handleFileChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setText(await f.text());
      setError(null);
    } catch {
      setError("Could not read the selected file.");
    }
  }

  async function handleImport() {
    setError(null);
    setProgress(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      setError(`JSON parse error: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    const rows: QuizImportRow[] = Array.isArray(parsed)
      ? (parsed as QuizImportRow[])
      : [parsed as QuizImportRow];
    if (rows.length === 0) {
      setError("No quizzes found in the JSON.");
      return;
    }

    const cleaned: Quiz[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const idx = i + 1;
      if (!r || typeof r !== "object") {
        setError(`Quiz #${idx} is not an object.`);
        return;
      }
      const level = Number(r.level);
      if (!Number.isInteger(level) || level < 1 || level > 5) {
        setError(`Quiz #${idx}: "level" must be 1..5.`);
        return;
      }
      const name = typeof r.name === "string" && r.name.trim() ? r.name.trim() : `Quiz ${idx}`;
      let dueMs = 0;
      if (typeof r.dueDate === "number") dueMs = r.dueDate;
      else if (typeof r.dueDate === "string" && r.dueDate.trim()) {
        const t = Date.parse(r.dueDate);
        if (isNaN(t)) {
          setError(`Quiz #${idx}: "dueDate" "${r.dueDate}" is not a valid date.`);
          return;
        }
        dueMs = t;
      }
      const qs = Array.isArray(r.questions) ? r.questions : [];
      if (qs.length === 0) {
        setError(`Quiz #${idx}: needs at least one question.`);
        return;
      }
      const questions: Question[] = [];
      for (let j = 0; j < qs.length; j++) {
        const q = qs[j];
        const qi = j + 1;
        const prompt = q.prompt ?? q.question;
        if (typeof prompt !== "string" || !prompt.trim()) {
          setError(`Quiz #${idx} Q${qi}: needs a prompt.`);
          return;
        }
        const rawChoices = q.choices ?? q.options;
        if (!Array.isArray(rawChoices)) {
          setError(`Quiz #${idx} Q${qi}: "choices" must be an array.`);
          return;
        }
        const choices = (rawChoices as unknown[])
          .map((c) => (typeof c === "string" ? c.trim() : ""))
          .filter(Boolean);
        if (choices.length < 2) {
          setError(`Quiz #${idx} Q${qi}: need at least 2 non-empty choices.`);
          return;
        }
        if (typeof q.answer !== "string" || !choices.includes(q.answer.trim())) {
          setError(
            `Quiz #${idx} Q${qi}: "answer" must match one of the choices exactly.`,
          );
          return;
        }
        const points =
          typeof q.points === "number" && q.points >= 0 ? Math.floor(q.points) : defaultPoints;
        questions.push({
          id: q.id?.trim() || `q-${Date.now()}-${i}-${j}-${Math.floor(Math.random() * 10000)}`,
          level: level as LevelId,
          category: "test",
          type: "multiple_choice",
          prompt: prompt.trim(),
          choices,
          answer: q.answer.trim(),
          points,
        });
      }
      cleaned.push({
        id: r.id?.trim() || `quiz-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`,
        name,
        level: level as LevelId,
        maxAttempts: Number.isInteger(r.maxAttempts) && r.maxAttempts! >= 0 ? r.maxAttempts! : 1,
        dueDate: dueMs,
        allowLate: !!r.allowLate,
        questions,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    setSaving(true);
    try {
      for (let i = 0; i < cleaned.length; i++) {
        setProgress({ done: i, total: cleaned.length });
        await saveQuiz(cleaned[i]);
      }
      setProgress({ done: cleaned.length, total: cleaned.length });
      await onImported();
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlay}>
      <div style={{ ...panel, maxWidth: 720 }}>
        <h2 className="title" style={{ fontSize: 24 }}>IMPORT QUIZZES</h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#333" }}>
          Paste or upload a JSON array of quizzes with embedded questions.
          Each quiz needs <code>name</code>, <code>level</code> (1–5), and a
          <code> questions</code> array. Optional: <code>maxAttempts</code>{" "}
          (0 = unlimited), <code>dueDate</code> (ISO date or ms epoch),{" "}
          <code>allowLate</code>.
        </p>
        <input
          type="file"
          accept="application/json,.json"
          onChange={handleFileChoose}
          style={{ fontSize: 14, marginBottom: 10 }}
        />
        <textarea
          rows={14}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={sample}
          style={{
            width: "100%",
            fontFamily: 'ui-monospace, "Courier New", monospace',
            fontSize: 14,
            lineHeight: 1.5,
          }}
          spellCheck={false}
        />
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button onClick={() => setText(sample)}>Use Sample</button>
          <button onClick={() => setText("")} disabled={!text}>
            Clear
          </button>
        </div>
        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "#fde2e2",
              border: "2px solid #a52020",
              fontSize: 13,
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        )}
        {progress && !error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: progress.done === progress.total ? "#dcefe0" : "#fef3c7",
              border: `2px solid ${progress.done === progress.total ? "#2a7a43" : "#a88120"}`,
              fontSize: 13,
            }}
          >
            {progress.done === progress.total
              ? `✓ Imported ${progress.total} quiz${progress.total === 1 ? "" : "zes"}.`
              : `Saving ${progress.done} / ${progress.total}...`}
          </div>
        )}
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button
            className="btn-red"
            onClick={handleImport}
            disabled={saving || !text.trim()}
          >
            {saving ? "Importing..." : "Import"}
          </button>
          <button onClick={onCancel} disabled={saving}>
            {progress?.done === progress?.total && progress ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
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
  const [filterCategory, setFilterCategory] = useState<QuestionCategory | "all">("all");
  const [reseeding, setReseeding] = useState(false);
  const [importing, setImporting] = useState(false);

  function blank(): Question {
    return {
      id: `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      level: filterLevel || 1,
      category: filterCategory === "all" ? "test" : filterCategory,
      type: "multiple_choice",
      prompt: "",
      choices: ["", "", "", ""],
      answer: "",
      points: defaultPoints,
    };
  }

  async function handleReseed() {
    const ok = confirm(
      "Reseed ALL questions from the built-in defaults?\n\n" +
        "This DELETES every existing question (Bible + test) and replaces them " +
        "with the default Bible trivia + ACU-history test questions. " +
        "Student progress is not affected.",
    );
    if (!ok) return;
    setReseeding(true);
    try {
      await reseedQuestions();
      await onReload();
    } finally {
      setReseeding(false);
    }
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

  const normalized = questions.map((q) => ({ ...q, category: q.category ?? "bible" }));
  const filtered = normalized.filter((q) => {
    if (filterLevel !== 0 && q.level !== filterLevel) return false;
    if (filterCategory !== "all" && q.category !== filterCategory) return false;
    return true;
  });

  return (
    <>
      <div className="btn-row" style={{ marginBottom: 10, alignItems: "center" }}>
        <label style={{ fontSize: 14 }}>Level:</label>
        <select value={filterLevel} onChange={(e) => setFilterLevel(parseInt(e.target.value, 10) as 0 | LevelId)}>
          <option value={0}>All</option>
          {([1, 2, 3, 4, 5] as LevelId[]).map((l) => (
            <option key={l} value={l}>
              {l}. {LEVEL_NAMES[l]}
            </option>
          ))}
        </select>
        <label style={{ fontSize: 14 }}>Category:</label>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as QuestionCategory | "all")}
        >
          <option value="all">All</option>
          <option value="bible">📖 Bible (power-up)</option>
          <option value="test">📝 Test (graded)</option>
        </select>
        <button className="btn-red" onClick={() => setEditing(blank())}>
          + Add Question
        </button>
        <button
          onClick={() => setImporting(true)}
          title="Bulk-import Bible and/or Test questions from JSON"
        >
          📋 Import JSON
        </button>
        <button
          className="btn-navy"
          onClick={handleReseed}
          disabled={reseeding}
          title="Wipe and reload the built-in defaults (Bible trivia + ACU history)"
        >
          {reseeding ? "Reseeding..." : "Reseed Defaults"}
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th>Level</th>
              <th>Category</th>
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
                <td>{q.category === "bible" ? "📖 Bible" : "📝 Test"}</td>
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

      {importing && (
        <ImportJsonDialog
          defaultPoints={defaultPoints}
          defaultCategory={filterCategory === "all" ? "test" : filterCategory}
          defaultLevel={filterLevel || 1}
          onCancel={() => setImporting(false)}
          onImported={async () => {
            setImporting(false);
            await onReload();
          }}
        />
      )}
    </>
  );
}

// ---------------- Import JSON ----------------

// The importer accepts two roughly-equivalent schemas so pasting in
// question banks from various sources works without reformatting:
//
//   { level, category, prompt, choices, answer, points, id }   ← native
//   { difficulty, question, options, answer, category, points, id }
//
// Any of those aliases are normalised into the native shape before
// validation. Missing category defaults to whatever category the admin
// is currently filtering on (or "test" when viewing All).
interface ImportRow {
  level?: number;
  difficulty?: number;
  category?: string;
  prompt?: string;
  question?: string;
  choices?: unknown;
  options?: unknown;
  answer?: string;
  points?: number;
  id?: string;
  type?: string;
}

function ImportJsonDialog({
  defaultPoints,
  defaultCategory,
  defaultLevel,
  onCancel,
  onImported,
}: {
  defaultPoints: number;
  defaultCategory: QuestionCategory;
  defaultLevel: LevelId;
  onCancel: () => void;
  onImported: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const sample = JSON.stringify(
    [
      {
        difficulty: defaultLevel,
        question: "Who built the ark?",
        options: ["Moses", "Noah", "Abraham", "David"],
        answer: "Noah",
      },
      {
        difficulty: defaultLevel,
        question: "Who was swallowed by a great fish?",
        options: ["Jonah", "Daniel", "Peter", "Elijah"],
        answer: "Jonah",
      },
    ],
    null,
    2,
  );

  async function handleFileChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const content = await f.text();
      setText(content);
      setError(null);
    } catch {
      setError("Could not read the selected file.");
    }
  }

  async function handleImport() {
    setError(null);
    setProgress(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      setError(
        `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    // Accept either an array or an object with {questions: [...]}.
    let rows: ImportRow[];
    if (Array.isArray(parsed)) {
      rows = parsed as ImportRow[];
    } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as { questions?: unknown }).questions)) {
      rows = (parsed as { questions: ImportRow[] }).questions;
    } else {
      setError(
        'Expected a JSON array of questions, or an object like {"questions": [...]}.',
      );
      return;
    }

    if (rows.length === 0) {
      setError("The JSON had no question entries.");
      return;
    }

    // Validate each row first so we either import everything or nothing.
    const cleaned: Question[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const idx = i + 1;
      if (!r || typeof r !== "object") {
        setError(`Entry #${idx} is not an object.`);
        return;
      }
      // Accept aliases: `difficulty` -> level, `question` -> prompt,
      // `options` -> choices.
      const rawLevel = r.level ?? r.difficulty;
      const level = Number(rawLevel);
      if (!Number.isInteger(level) || level < 1 || level > 5) {
        setError(
          `Entry #${idx}: "level" (or "difficulty") must be an integer 1..5.`,
        );
        return;
      }
      const category = r.category ?? defaultCategory;
      if (category !== "bible" && category !== "test") {
        setError(`Entry #${idx}: "category" must be "bible" or "test".`);
        return;
      }
      const prompt = r.prompt ?? r.question;
      if (typeof prompt !== "string" || prompt.trim() === "") {
        setError(`Entry #${idx}: "prompt" (or "question") is required.`);
        return;
      }
      const rawChoices = r.choices ?? r.options;
      if (!Array.isArray(rawChoices)) {
        setError(
          `Entry #${idx}: "choices" (or "options") must be an array of strings.`,
        );
        return;
      }
      const choices = (rawChoices as unknown[])
        .map((c) => (typeof c === "string" ? c.trim() : ""))
        .filter((c) => c !== "");
      if (choices.length < 2) {
        setError(`Entry #${idx}: need at least 2 non-empty choices.`);
        return;
      }
      if (typeof r.answer !== "string" || r.answer.trim() === "") {
        setError(`Entry #${idx}: "answer" is required.`);
        return;
      }
      if (!choices.includes(r.answer.trim())) {
        setError(
          `Entry #${idx}: "answer" (${r.answer}) must match one of the choices exactly.`,
        );
        return;
      }
      const points =
        typeof r.points === "number" && r.points >= 0 && r.points <= 1000
          ? Math.floor(r.points)
          : defaultPoints;
      const id =
        typeof r.id === "string" && r.id.trim() !== ""
          ? r.id.trim()
          : `q-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`;
      cleaned.push({
        id,
        level: level as LevelId,
        category: category as QuestionCategory,
        type: "multiple_choice",
        prompt: prompt.trim(),
        choices,
        answer: r.answer.trim(),
        points,
      });
    }

    // All valid — write sequentially so any RTDB rule rejection surfaces
    // with the failing entry's index.
    setSaving(true);
    try {
      for (let i = 0; i < cleaned.length; i++) {
        setProgress({ done: i, total: cleaned.length });
        await saveQuestion(cleaned[i]);
      }
      setProgress({ done: cleaned.length, total: cleaned.length });
      await onImported();
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlay}>
      <div style={{ ...panel, maxWidth: 720 }}>
        <h2 className="title" style={{ fontSize: 24 }}>IMPORT QUESTIONS FROM JSON</h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#333" }}>
          Paste or upload a JSON array of Bible and/or Test questions. Each
          entry needs: <code>difficulty</code> / <code>level</code> (1-5),{" "}
          <code>question</code> / <code>prompt</code>, <code>options</code>{" "}
          / <code>choices</code> (typically 4 strings), and{" "}
          <code>answer</code> (must match one of the options exactly).
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#333" }}>
          <code>category</code> (<code>&quot;bible&quot;</code> or{" "}
          <code>&quot;test&quot;</code>) is optional — if omitted it
          defaults to the panel&apos;s current Category filter (currently{" "}
          <strong>{defaultCategory}</strong>). <code>points</code> and{" "}
          <code>id</code> are also optional.
        </p>

        <div style={{ marginBottom: 10 }}>
          <input
            type="file"
            accept="application/json,.json"
            onChange={handleFileChoose}
            style={{ fontSize: 14 }}
          />
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={sample}
          rows={14}
          style={{
            width: "100%",
            fontFamily: 'ui-monospace, "Courier New", monospace',
            fontSize: 14,
            lineHeight: 1.5,
          }}
          spellCheck={false}
        />

        <div className="btn-row" style={{ marginTop: 8 }}>
          <button
            type="button"
            onClick={() => setText(sample)}
            title="Load a small example you can edit"
          >
            Use Sample
          </button>
          <button
            type="button"
            onClick={() => setText("")}
            disabled={!text}
          >
            Clear
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "#fde2e2",
              border: "2px solid #a52020",
              fontSize: 13,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        )}
        {progress && !error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: progress.done === progress.total ? "#dcefe0" : "#fef3c7",
              border: `2px solid ${progress.done === progress.total ? "#2a7a43" : "#a88120"}`,
              fontSize: 13,
            }}
          >
            {progress.done === progress.total
              ? `✓ Imported ${progress.total} question${progress.total === 1 ? "" : "s"}.`
              : `Saving ${progress.done} / ${progress.total}...`}
          </div>
        )}

        <div className="btn-row" style={{ marginTop: 16 }}>
          <button
            className="btn-red"
            onClick={handleImport}
            disabled={saving || !text.trim()}
          >
            {saving ? "Importing..." : "Import"}
          </button>
          <button onClick={onCancel} disabled={saving}>
            {progress?.done === progress?.total && progress ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
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
        <h2 className="title" style={{ fontSize: 24 }}>EDIT QUESTION</h2>
        <div style={{ display: "grid", gap: 12, fontSize: 14 }}>
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
          <Row label="Category">
            <select
              value={question.category ?? "bible"}
              onChange={(e) =>
                onChange({ ...question, category: e.target.value as QuestionCategory })
              }
            >
              <option value="bible">📖 Bible power-up (floating Bible pickup)</option>
              <option value="test">📝 Test question (pen &amp; paper pickup)</option>
            </select>
          </Row>
          <Row label="Prompt">
            <textarea
              rows={3}
              value={question.prompt}
              onChange={(e) => onChange({ ...question, prompt: e.target.value })}
            />
          </Row>
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
    <div style={{ display: "grid", gap: 16, fontSize: 14 }}>
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
        gridTemplateColumns: "220px 1fr",
        alignItems: "center",
        gap: 12,
        marginBottom: 10,
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
  fontSize: 13,
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
