"use client";

import { ref, get, set, update, remove, child } from "firebase/database";
import { getFirebase } from "./firebase";
import {
  DEFAULT_CONFIG,
  DEFAULT_QUESTIONS,
  GameConfig,
  LevelId,
  LevelResult,
  PlayerState,
  Question,
  QuestionCategory,
} from "./types";

// Back-compat helper: questions written before `category` existed were all
// Bible power-up trivia. Treat missing values as "bible".
function normalizeQuestion(q: Question): Question {
  return { ...q, category: q.category ?? "bible" };
}

// Realtime Database paths:
//   /config/game                     -> GameConfig
//   /questions/<id>                  -> Question
//   /players/<uid>                   -> PlayerState

// ------- Game config -------
export async function loadGameConfig(): Promise<GameConfig> {
  const { db } = getFirebase();
  if (!db) return DEFAULT_CONFIG;
  try {
    const snap = await get(ref(db, "config/game"));
    if (!snap.exists()) return DEFAULT_CONFIG;
    const data = snap.val() as Partial<GameConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...data,
      levels: { ...DEFAULT_CONFIG.levels, ...(data.levels || {}) },
    };
  } catch (err) {
    console.warn("loadGameConfig failed, using defaults", err);
    return DEFAULT_CONFIG;
  }
}

export async function saveGameConfig(cfg: GameConfig): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  await set(ref(db, "config/game"), cfg);
}

// ------- Questions -------
function filterQuestions(
  qs: Question[],
  level?: LevelId,
  category?: QuestionCategory,
): Question[] {
  let out = qs.map(normalizeQuestion);
  if (level != null) out = out.filter((q) => q.level === level);
  if (category != null) out = out.filter((q) => q.category === category);
  return out;
}

export async function loadQuestions(
  level?: LevelId,
  category?: QuestionCategory,
): Promise<Question[]> {
  const { db } = getFirebase();
  if (!db) return filterQuestions(DEFAULT_QUESTIONS, level, category);
  try {
    const snap = await get(ref(db, "questions"));
    let qs: Question[] = [];
    if (snap.exists()) {
      const val = snap.val() as Record<string, Question>;
      qs = Object.keys(val).map((k) => ({ ...val[k], id: k }));
    }
    if (qs.length === 0) qs = DEFAULT_QUESTIONS;
    return filterQuestions(qs, level, category);
  } catch (err) {
    console.warn("loadQuestions failed, using defaults", err);
    return filterQuestions(DEFAULT_QUESTIONS, level, category);
  }
}

export async function saveQuestion(q: Question): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  // Ensure category is always set so the game engine can route pickups.
  const toSave: Question = { ...q, category: q.category ?? "bible" };
  await set(ref(db, `questions/${q.id}`), toSave);
}

export async function deleteQuestion(id: string): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  await remove(ref(db, `questions/${id}`));
}

export async function seedQuestionsIfEmpty(): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  const snap = await get(ref(db, "questions"));
  if (!snap.exists()) {
    const payload: Record<string, Question> = {};
    for (const q of DEFAULT_QUESTIONS) payload[q.id] = q;
    await set(ref(db, "questions"), payload);
  }
}

/**
 * Wipe the /questions node and repopulate it with the default seed set
 * (Bible power-up trivia + ACU-history graded questions). Intended for
 * admins who need to refresh the defaults after category/content changes.
 */
export async function reseedQuestions(): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  const payload: Record<string, Question> = {};
  for (const q of DEFAULT_QUESTIONS) payload[q.id] = q;
  await set(ref(db, "questions"), payload);
}

// ------- Players -------
export function newPlayerState(uid: string, email: string): PlayerState {
  // `isAdmin` is always false on new player creation because the RTDB rules
  // forbid users from self-promoting. The first admin is bootstrapped by
  // editing the `isAdmin` flag in the Firebase console; after that the admin
  // panel itself can manage other admins.
  return {
    uid,
    email,
    isAdmin: false,
    totalScore: 0,
    lives: DEFAULT_CONFIG.startingLives,
    currentLevel: 1,
    checkpointLevel: 1,
    checkpointQuestionIndex: 0,
    levelResults: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function loadPlayer(uid: string): Promise<PlayerState | null> {
  const { db } = getFirebase();
  if (!db) return null;
  const snap = await get(ref(db, `players/${uid}`));
  if (!snap.exists()) return null;
  const val = snap.val() as PlayerState;
  // RTDB does not preserve empty arrays; normalize.
  if (!val.levelResults) val.levelResults = [];
  return val;
}

export async function savePlayer(p: PlayerState): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  p.updatedAt = Date.now();
  const sanitized: PlayerState = {
    ...p,
    // Firebase RTDB rejects `undefined` values.
    character: p.character ?? ("" as unknown as PlayerState["character"]),
    displayName: p.displayName ?? "",
  };
  // Remove undefineds entirely
  const clean = JSON.parse(JSON.stringify(sanitized));
  await set(ref(db, `players/${p.uid}`), clean);
}

export async function updatePlayer(
  uid: string,
  patch: Partial<PlayerState>,
): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  const clean = JSON.parse(JSON.stringify({ ...patch, updatedAt: Date.now() }));
  await update(ref(db, `players/${uid}`), clean);
}

export async function listPlayers(): Promise<PlayerState[]> {
  const { db } = getFirebase();
  if (!db) return [];
  const snap = await get(ref(db, "players"));
  if (!snap.exists()) return [];
  const val = snap.val() as Record<string, PlayerState>;
  return Object.keys(val).map((k) => {
    const v = val[k];
    if (!v.levelResults) v.levelResults = [];
    return v;
  });
}

export async function resetPlayer(uid: string): Promise<void> {
  const existing = await loadPlayer(uid);
  if (!existing) return;
  const reset: PlayerState = {
    ...existing,
    totalScore: 0,
    lives: DEFAULT_CONFIG.startingLives,
    currentLevel: 1,
    checkpointLevel: 1,
    checkpointQuestionIndex: 0,
    levelResults: [],
    character: undefined,
    updatedAt: Date.now(),
  };
  await savePlayer(reset);
}

export async function appendLevelResult(
  uid: string,
  result: LevelResult,
): Promise<void> {
  const p = await loadPlayer(uid);
  if (!p) return;
  const existing = (p.levelResults || []).filter((r) => r.level !== result.level);
  const merged = [...existing, result].sort((a, b) => a.level - b.level);
  const updated: PlayerState = {
    ...p,
    levelResults: merged,
    totalScore: merged.reduce((s, r) => s + r.score, 0),
    checkpointLevel: result.level,
    checkpointQuestionIndex: 0,
    currentLevel: Math.min(5, result.level + 1) as LevelId,
    updatedAt: Date.now(),
  };
  await savePlayer(updated);
}
