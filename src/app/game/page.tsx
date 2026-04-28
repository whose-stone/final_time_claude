"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  appendLevelResult,
  loadGameConfig,
  loadQuestions,
  loadQuiz,
  recordQuizAttempt,
  updatePlayer,
} from "@/lib/db";
import {
  Character,
  DEFAULT_CONFIG,
  GameConfig,
  LevelId,
  Question,
  Quiz,
} from "@/lib/types";
import { Game } from "@/lib/game/engine";
import { GameEvent, LevelStats } from "@/lib/game/types";
import GameCanvas from "@/components/GameCanvas";
import MobileControls from "@/components/MobileControls";
import HUD from "@/components/HUD";
import TriviaModal from "@/components/TriviaModal";
import LevelResults from "@/components/LevelResults";

// Next.js 14 requires useSearchParams to be inside a Suspense boundary
// during static prerender, otherwise the page fails `next build`. The
// actual gameplay UI lives in <GamePageInner/>; the default export just
// wraps it so Next can bail out to client rendering for the query
// string without breaking the build.
export default function GamePage() {
  return (
    <Suspense
      fallback={
        <main className="center-screen">
          <div className="card">Loading your adventure...</div>
        </main>
      }
    >
      <GamePageInner />
    </Suspense>
  );
}

function GamePageInner() {
  const { user, player, loading, isAdmin, refreshPlayer, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Admin playtest: /game?level=3&char=boy&admin=1 jumps straight into a
  // level for testing without touching the player's saved progress. Only
  // honored when the current user is actually an admin.
  const isPlaytest =
    isAdmin && (searchParams?.get("admin") === "1");
  const playtestLevel = (() => {
    const raw = parseInt(searchParams?.get("level") || "", 10);
    return Number.isFinite(raw) && raw >= 1 && raw <= 5 ? (raw as LevelId) : null;
  })();
  const playtestChar: Character | null = (() => {
    const raw = searchParams?.get("char");
    return raw === "boy" || raw === "girl" ? raw : null;
  })();
  const quizIdParam = searchParams?.get("quizId") || null;

  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState<number>(Date.now());
  const [currentLevel, setCurrentLevel] = useState<LevelId>(1);
  const [gameKey, setGameKey] = useState(0); // forces Game recreation on replay
  const [ready, setReady] = useState(false);

  // Modal / UI state
  const [triviaQuestion, setTriviaQuestion] = useState<Question | null>(null);
  const [triviaMode, setTriviaMode] = useState<"bible" | "pen">("bible");
  const [triviaIndex, setTriviaIndex] = useState<number>(0); // for pen pickups
  const [usedBibleIds, setUsedBibleIds] = useState<Set<string>>(new Set());

  // Cumulative stats across the whole quiz run (levels 1→5). A quiz
  // attempt is recorded once at boss-defeat with these totals so the
  // gradebook gets one entry per full play-through, not one per level.
  const [quizRunStats, setQuizRunStats] = useState<LevelStats>({
    level: 1,
    correct: 0,
    incorrect: 0,
    score: 0,
    gargoylesDefeated: 0,
    timeSeconds: 0,
  });

  const [results, setResults] = useState<null | (LevelStats & { boss?: boolean })>(null);
  const [gameOver, setGameOver] = useState(false);
  const [hudTick, setHudTick] = useState(0);

  const gameRef = useRef<Game | null>(null);
  const eventHandlerRef = useRef<(e: GameEvent) => void>(() => {});
  const builtRef = useRef<{ level: LevelId | 0; key: number }>({ level: 0, key: -1 });

  // Redirect when not authed or no character. Admins playtesting via
  // ?admin=1 skip the character-selection redirect because the playtest
  // URL carries the character choice in its query.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (player && !player.character && !(isPlaytest && playtestChar)) {
      router.replace("/character");
    }
  }, [user, player, loading, router, isPlaytest, playtestChar]);

  // Load config + questions. If the URL carries a quizId, also pull that
  // quiz so its embedded questions can override pen pickups for this run.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [cfg, qs, quiz] = await Promise.all([
        loadGameConfig(),
        loadQuestions(),
        quizIdParam ? loadQuiz(quizIdParam) : Promise.resolve(null),
      ]);
      setConfig(cfg);
      setAllQuestions(qs);
      setActiveQuiz(quiz);
      setAttemptStartedAt(Date.now());
      setReady(true);
    })();
  }, [user, quizIdParam]);

  // Initialize starting level. In admin playtest mode the query param wins
  // so the admin lands exactly on the level they picked (even when a quiz
  // is also attached — letting admins spot-check any level of a
  // multi-level quiz). Students running an assigned quiz always start at
  // level 1 and play through the full 1→5 adventure with the quiz's
  // questions filtered per level; one quiz attempt covers the whole run.
  useEffect(() => {
    if (!ready) return;
    if (isPlaytest && playtestLevel) {
      setCurrentLevel(playtestLevel);
      return;
    }
    if (activeQuiz) {
      setCurrentLevel(1);
      setQuizRunStats({
        level: 1,
        correct: 0,
        incorrect: 0,
        score: 0,
        gargoylesDefeated: 0,
        timeSeconds: 0,
      });
      return;
    }
    if (!player) return;
    setCurrentLevel(player.checkpointLevel || player.currentLevel || 1);
  }, [player, ready, isPlaytest, playtestLevel, activeQuiz]);

  const levelCfg = config.levels[currentLevel];
  // Pen+paper pickups draw from the active quiz's embedded question list
  // when one is loaded — filtered to the current level so a multi-level
  // quiz spawns only the questions tagged for whichever stage is being
  // played. Free-play practice falls back to the global "test" pool.
  const levelQuestions = useMemo(() => {
    if (activeQuiz) {
      return (activeQuiz.questions || []).filter((q) => q.level === currentLevel);
    }
    const atLevel = allQuestions.filter((q) => q.level === currentLevel);
    const tests = atLevel.filter((q) => (q.category ?? "bible") === "test");
    const pool = tests.length > 0 ? tests : atLevel;
    return pool.slice(0, levelCfg.questionCount);
  }, [allQuestions, currentLevel, levelCfg.questionCount, activeQuiz]);
  const penQuestionCount = activeQuiz
    ? levelQuestions.length
    : levelCfg.questionCount;
  // Floating Bible pickups always ask "bible"-category trivia.
  const bibleQuestions = useMemo(() => {
    const atLevel = allQuestions.filter((q) => q.level === currentLevel);
    const bibles = atLevel.filter((q) => (q.category ?? "bible") === "bible");
    return bibles.length > 0 ? bibles : atLevel;
  }, [allQuestions, currentLevel]);

  // Handle events from engine
  const onEvent = useCallback(
    (e: GameEvent) => {
      const g = gameRef.current;
      if (!g) return;
      switch (e.type) {
        case "bible_collected": {
          // Pick a random Bible-trivia question (3rd-grade level) not yet used in this life.
          const pool = bibleQuestions.filter((q) => !usedBibleIds.has(q.id));
          const pick = (pool.length > 0 ? pool : bibleQuestions)[
            Math.floor(Math.random() * Math.max(1, pool.length || bibleQuestions.length))
          ];
          if (!pick) {
            g.resume();
            return;
          }
          setUsedBibleIds((prev) => {
            const next = new Set(prev);
            next.add(pick.id);
            return next;
          });
          setTriviaMode("bible");
          setTriviaQuestion(pick);
          break;
        }
        case "pen_collected": {
          const q = levelQuestions[e.questionIndex];
          if (!q) {
            g.resume();
            return;
          }
          setTriviaIndex(e.questionIndex);
          setTriviaMode("pen");
          setTriviaQuestion(q);
          break;
        }
        case "level_complete":
        case "boss_defeated": {
          handleLevelEnd(e.stats, e.type === "boss_defeated");
          break;
        }
        case "game_over": {
          setGameOver(true);
          setResults({
            level: currentLevel,
            correct: gameRef.current?.stats.correct ?? 0,
            incorrect: gameRef.current?.stats.incorrect ?? 0,
            score: gameRef.current?.stats.score ?? 0,
            gargoylesDefeated: gameRef.current?.stats.gargoylesDefeated ?? 0,
            timeSeconds: gameRef.current?.stats.timeSeconds ?? 0,
          });
          break;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bibleQuestions, levelQuestions, usedBibleIds, currentLevel],
  );

  // Keep a ref to the latest onEvent so the Game instance (which stores a
  // single callback at construction) always sees the latest React state.
  useEffect(() => {
    eventHandlerRef.current = onEvent;
  }, [onEvent]);

  // Build the Game instance when level changes. Guard against rebuilds that
  // are triggered purely by `player` identity changing (e.g. after we refresh
  // player state post-level), which would otherwise reset mid-run progress.
  useEffect(() => {
    if (!ready) return;
    // In admin playtest mode we don't need a saved player/character — the
    // query param supplies the character, and checkpoints are bypassed.
    const effectiveChar: Character | undefined = isPlaytest
      ? (playtestChar ?? player?.character ?? "boy")
      : player?.character;
    if (!isPlaytest && (!player || !effectiveChar)) return;
    if (isPlaytest && !effectiveChar) return;
    if (builtRef.current.level === currentLevel && builtRef.current.key === gameKey) return;
    builtRef.current = { level: currentLevel, key: gameKey };
    const cp =
      isPlaytest
        ? 0
        : player && player.checkpointLevel === currentLevel
          ? player.checkpointQuestionIndex
          : 0;
    const lives = isPlaytest
      ? 99
      : config.limitedLives
        ? Math.max(1, (player?.lives ?? config.startingLives))
        : 99;
    const g = new Game(
      {
        level: currentLevel,
        character: effectiveChar!,
        lives,
        gargoyleCount: levelCfg.gargoyleCount,
        bibleCount: levelCfg.triviaBibleCount,
        questionCount: penQuestionCount,
        limitedLives: isPlaytest ? false : config.limitedLives,
        onEvent: (e: GameEvent) => eventHandlerRef.current(e),
      },
      cp,
    );
    gameRef.current = g;
    setUsedBibleIds(new Set());
    setResults(null);
    setGameOver(false);
    setTriviaQuestion(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, currentLevel, player, ready, isPlaytest, playtestChar]);

  // Tick HUD regularly
  useEffect(() => {
    const id = setInterval(() => setHudTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  async function handleLevelEnd(stats: LevelStats, boss: boolean) {
    setResults({ ...stats, boss });
    // Admin playtests never touch stored progress.
    if (isPlaytest || !player) return;
    await appendLevelResult(player.uid, {
      level: stats.level,
      score: stats.score,
      correct: stats.correct,
      incorrect: stats.incorrect,
      gargoylesDefeated: stats.gargoylesDefeated,
      timeSeconds: stats.timeSeconds,
      completedAt: Date.now(),
    });
    // For quiz runs, accumulate stats across every level instead of
    // recording one attempt per level — the gradebook entry is finalized
    // when the boss is defeated (end of the 1→5 run).
    if (activeQuiz) {
      const totals: LevelStats = {
        level: stats.level,
        correct: quizRunStats.correct + stats.correct,
        incorrect: quizRunStats.incorrect + stats.incorrect,
        score: quizRunStats.score + stats.score,
        gargoylesDefeated:
          quizRunStats.gargoylesDefeated + stats.gargoylesDefeated,
        timeSeconds: quizRunStats.timeSeconds + stats.timeSeconds,
      };
      setQuizRunStats(totals);
      if (boss) {
        const completedAt = Date.now();
        const isLate =
          activeQuiz.dueDate > 0 && completedAt > activeQuiz.dueDate;
        await recordQuizAttempt(player.uid, {
          quizId: activeQuiz.id,
          startedAt: attemptStartedAt,
          completedAt,
          score: totals.score,
          correct: totals.correct,
          incorrect: totals.incorrect,
          gargoylesDefeated: totals.gargoylesDefeated,
          timeSeconds: totals.timeSeconds,
          isLate,
        });
      }
    }
    await refreshPlayer();
  }

  async function onTriviaResolve(correct: boolean, _given: string) {
    const g = gameRef.current;
    if (!g || !triviaQuestion) return;
    if (triviaMode === "bible") {
      // Power-up: +3 prayers and the question's points when correct.
      // Bible answers NEVER touch correct/incorrect so they don't affect
      // the quiz letter grade — only score.
      if (correct) {
        g.grantPrayers(3);
        g.grantPoints(triviaQuestion.points || 0);
      }
    } else {
      // Level question: score points, advance checkpoint
      g.recordAnswer(correct, triviaQuestion.points || levelCfg.pointsPerQuestion);
      // Playtests don't advance the real student checkpoint.
      if (!isPlaytest && player) {
        await updatePlayer(player.uid, {
          checkpointLevel: currentLevel,
          checkpointQuestionIndex: triviaIndex + 1,
        });
      }
    }
    setTriviaQuestion(null);
    g.resume();
  }

  function onContinue() {
    if (isPlaytest) {
      // After a playtest run, send the admin back to the admin panel.
      router.replace("/admin");
      return;
    }
    // Both free-play and quiz mode walk levels 1→5; level 5 is the boss
    // and ends the run, returning the student to the home screen.
    if (currentLevel < 5) {
      setCurrentLevel((l) => (Math.min(5, l + 1) as LevelId));
      setGameKey((k) => k + 1);
    } else {
      router.replace("/start");
    }
  }

  function onReplay() {
    setAttemptStartedAt(Date.now());
    setGameKey((k) => k + 1);
  }

  function onExit() {
    if (isPlaytest) {
      router.replace("/admin");
      return;
    }
    if (activeQuiz) {
      router.replace("/start");
      return;
    }
    logout().finally(() => router.replace("/"));
  }

  // In playtest mode we don't require a saved player profile — an admin
  // who has never picked a character can still launch the game via the
  // admin Playtest panel.
  if (loading || !ready || !gameRef.current || (!isPlaytest && !player)) {
    return (
      <main className="center-screen">
        <div className="card">Loading your adventure...</div>
      </main>
    );
  }

  const g = gameRef.current;
  const pct =
    g.stats.correct + g.stats.incorrect > 0
      ? (g.stats.correct / (g.stats.correct + g.stats.incorrect)) * 100
      : 100;

  return (
    <main style={{ padding: 16, minHeight: "100vh" }}>
      {activeQuiz && !isPlaytest && (
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto 10px",
            background: "#ba0c2f",
            color: "#fff",
            border: "3px solid #111",
            borderRadius: 6,
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            fontSize: 14,
            letterSpacing: 1,
          }}
        >
          <span>
            📝 QUIZ: {activeQuiz.name}
            {activeQuiz.dueDate > 0 && Date.now() > activeQuiz.dueDate
              ? " · LATE"
              : ""}
          </span>
          <button
            style={{ fontSize: 13, padding: "6px 12px" }}
            onClick={() => router.replace("/start")}
          >
            ← Back to Quizzes
          </button>
        </div>
      )}
      {isPlaytest && (
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto 10px",
            background: "#ffd447",
            color: "#0b1b3a",
            border: "3px solid #0b1b3a",
            borderRadius: 6,
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            fontSize: 14,
            letterSpacing: 1,
            fontWeight: "bold",
          }}
        >
          <span>
            ★ ADMIN PLAYTEST · LEVEL {currentLevel} · progress is NOT saved
          </span>
          <button
            className="btn-navy"
            style={{ fontSize: 13, padding: "8px 14px" }}
            onClick={() => router.replace("/admin")}
          >
            ← Back to Admin
          </button>
        </div>
      )}
      <HUD
        levelId={currentLevel}
        prayers={g.player.prayers}
        lives={g.player.lives}
        nextQuestion={g.answeredQuestions + 1}
        totalQuestions={penQuestionCount}
        correct={g.stats.correct}
        incorrect={g.stats.incorrect}
        limitedLives={config.limitedLives}
      />

      <GameCanvas game={g} paused={!!triviaQuestion || !!results} />
      <MobileControls game={g} />

      <div
        style={{
          maxWidth: 960,
          margin: "12px auto",
          fontSize: 15,
          lineHeight: 1.6,
          color: "#222",
          textAlign: "center",
          background: "#faf3e0",
          border: "2px solid #111",
          borderRadius: 6,
          padding: "12px 16px",
        }}
      >
        ← → / A D to move · Space or ↑ to jump · F or Shift to pray ·
        Head-bump 📜 Ten Commandments blocks for prayers · Collect 📝 for
        questions
      </div>

      {triviaQuestion && (
        <TriviaModal
          question={triviaQuestion}
          headerLabel={
            triviaMode === "bible"
              ? "POWER-UP! BIBLE TRIVIA — ANSWER FOR 3 PRAYERS"
              : `LEVEL ${currentLevel} QUESTION ${triviaIndex + 1}/${penQuestionCount}`
          }
          onResolve={onTriviaResolve}
        />
      )}

      {results && (
        <LevelResults
          level={results.level}
          correct={results.correct}
          incorrect={results.incorrect}
          gargoylesDefeated={results.gargoylesDefeated}
          score={results.score}
          timeSeconds={results.timeSeconds}
          isBoss={!!results.boss}
          gameOver={gameOver}
          onContinue={onContinue}
          onReplay={onReplay}
          onExit={onExit}
        />
      )}

      {/* render nothing with pct, just keep reference */}
      <span style={{ display: "none" }}>{pct}{hudTick}</span>
    </main>
  );
}
