"use client";

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";

// Default config for the classroom Firebase project. These values are the
// web SDK's public identifiers (not secrets) — Firebase security comes from
// RTDB rules and the Authorized Domains list, not from hiding the API key.
// Env vars take precedence if set, so swapping to a different Firebase
// project just means defining NEXT_PUBLIC_FIREBASE_* values.
const DEFAULTS = {
  apiKey: "AIzaSyBfYXFazJ6UxnMD0-UiNtgR__eH0K4SxeI",
  authDomain: "claude-acu-game.firebaseapp.com",
  databaseURL: "https://claude-acu-game-default-rtdb.firebaseio.com",
  projectId: "claude-acu-game",
  storageBucket: "claude-acu-game.firebasestorage.app",
  messagingSenderId: "48561989254",
  appId: "1:48561989254:web:c6fbf2f1daef0daa77d307",
  measurementId: "G-BD1ZK141WM",
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || DEFAULTS.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || DEFAULTS.authDomain,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || DEFAULTS.databaseURL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULTS.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || DEFAULTS.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || DEFAULTS.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || DEFAULTS.appId,
  measurementId: DEFAULTS.measurementId,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;

export function getFirebase() {
  if (typeof window === "undefined") {
    return { app: null, auth: null, db: null };
  }
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getDatabase(app);
  }
  return { app, auth: auth!, db: db! };
}

export function getAdminEmails(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
