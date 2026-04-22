"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  deleteQuestion,
  listPlayers,
  loadGameConfig,
  loadQuestions,
  reseedQuestions,
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
  QuestionCategory,
} from "@/lib/types";
import { downloadPlayerPdf } from "@/lib/pdf";

type Tab = "players" | "questions" | "config" | "playtest";

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
        <button
          className={tab === "playtest" ? "btn-red" : ""}
          onClick={() => setTab("playtest")}
        >
          Playtest
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
    return <p style={{ fontSize: 14 }}>No players yet. Students will appear here after they sign up and begin playing.</p>;
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
