"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebase, getAdminEmails } from "./firebase";
import {
  DEFAULT_CONFIG,
  DEFAULT_QUESTIONS,
  GameConfig,
  LevelId,
  LevelResult,
  PlayerState,
  Question,
} from "./types";

// ------- Game config -------
const CONFIG_DOC = "config/game";

export async function loadGameConfig(): Promise<GameConfig> {
  const { db } = getFirebase();
  if (!db) return DEFAULT_CONFIG;
  try {
    const snap = await getDoc(doc(db, "config", "game"));
    if (!snap.exists()) return DEFAULT_CONFIG;
    const data = snap.data() as Partial<GameConfig>;
    return { ...DEFAULT_CONFIG, ...data, levels: { ...DEFAULT_CONFIG.levels, ...(data.levels || {}) } };
  } catch (err) {
    console.warn("loadGameConfig failed, using defaults", err);
    return DEFAULT_CONFIG;
  }
}

export async function saveGameConfig(cfg: GameConfig): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  await setDoc(doc(db, "config", "game"), cfg);
}

// ------- Questions -------
export async function loadQuestions(level?: LevelId): Promise<Question[]> {
  const { db } = getFirebase();
  if (!db) return level ? DEFAULT_QUESTIONS.filter((q) => q.level === level) : DEFAULT_QUESTIONS;
  try {
    const col = collection(db, "questions");
    const snap = await getDocs(col);
    let qs = snap.docs.map((d) => ({ ...(d.data() as Question), id: d.id }));
    if (qs.length === 0) qs = DEFAULT_QUESTIONS;
    return level ? qs.filter((q) => q.level === level) : qs;
  } catch (err) {
    console.warn("loadQuestions failed, using defaults", err);
    return level ? DEFAULT_QUESTIONS.filter((q) => q.level === level) : DEFAULT_QUESTIONS;
  }
}

export async function saveQuestion(q: Question): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  await setDoc(doc(db, "questions", q.id), q);
}

export async function deleteQuestion(id: string): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  await deleteDoc(doc(db, "questions", id));
}

export async function seedQuestionsIfEmpty(): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  const snap = await getDocs(collection(db, "questions"));
  if (snap.empty) {
    for (const q of DEFAULT_QUESTIONS) {
      await setDoc(doc(db, "questions", q.id), q);
    }
  }
}

// ------- Players -------
export function newPlayerState(uid: string, email: string): PlayerState {
  const adminEmails = getAdminEmails();
  return {
    uid,
    email,
    isAdmin: adminEmails.includes(email.toLowerCase()),
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
  const snap = await getDoc(doc(db, "players", uid));
  if (!snap.exists()) return null;
  return snap.data() as PlayerState;
}

export async function savePlayer(p: PlayerState): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  p.updatedAt = Date.now();
  await setDoc(doc(db, "players", p.uid), p);
}

export async function updatePlayer(uid: string, patch: Partial<PlayerState>): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  await updateDoc(doc(db, "players", uid), { ...patch, updatedAt: Date.now() });
}

export async function listPlayers(): Promise<PlayerState[]> {
  const { db } = getFirebase();
  if (!db) return [];
  const snap = await getDocs(collection(db, "players"));
  return snap.docs.map((d) => d.data() as PlayerState);
}

export async function resetPlayer(uid: string): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
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
  await setDoc(doc(db, "players", uid), reset);
}

export async function appendLevelResult(uid: string, result: LevelResult): Promise<void> {
  const p = await loadPlayer(uid);
  if (!p) return;
  const existing = p.levelResults.filter((r) => r.level !== result.level);
  const updated: PlayerState = {
    ...p,
    levelResults: [...existing, result].sort((a, b) => a.level - b.level),
    totalScore: [...existing, result].reduce((s, r) => s + r.score, 0),
    checkpointLevel: result.level,
    checkpointQuestionIndex: 0,
    currentLevel: (Math.min(5, result.level + 1) as LevelId),
    updatedAt: Date.now(),
  };
  await savePlayer(updated);
}
