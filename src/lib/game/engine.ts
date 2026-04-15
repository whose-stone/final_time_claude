import { LevelId } from "@/lib/types";
import { CANVAS_H, CANVAS_W, makeLevel } from "./levels";
import {
  GameEvent,
  Gargoyle,
  InputState,
  LevelData,
  LevelStats,
  Particle,
  Pickup,
  Platform,
  Player,
  Projectile,
} from "./types";
import { Character } from "@/lib/types";

const GRAVITY = 0.55;
const MOVE_SPEED = 3.8;
const JUMP_V = -12.2;
const PLAYER_W = 40;
const PLAYER_H = 52;
const GARGOYLE_W = 40;
const GARGOYLE_H = 44;
const BOSS_W = 70;
const BOSS_H = 80;
const PICKUP_W = 28;
const PICKUP_H = 28;
const PRAYER_SPEED = 8.5;
const TEMPTATION_SPEED = 3.2;
const HOMEWORK_SPEED = 4.5;
const INVINCIBLE_TICKS = 90;

let nextId = 1;
const uid = () => nextId++;

export interface GameStartArgs {
  level: LevelId;
  character: Character;
  lives: number;
  gargoyleCount: number;
  bibleCount: number;
  questionCount: number;
  limitedLives: boolean;
  onEvent: (e: GameEvent) => void;
}

export class Game {
  level: LevelData;
  player: Player;
  gargoyles: Gargoyle[] = [];
  projectiles: Projectile[] = [];
  pickups: Pickup[] = [];
  particles: Particle[] = [];
  input: InputState = { left: false, right: false, jump: false, shoot: false };
  camera = { x: 0 };
  ticks = 0;
  stats: LevelStats;
  paused = false;
  ended = false;
  onEvent: (e: GameEvent) => void;
  limitedLives: boolean;
  shootCooldown = 0;
  startTs = Date.now();
  answeredQuestions = 0;
  bossDefeated = false;

  // track which questionIndex pens have been handed out so checkpoint can be used
  initialCheckpointQ = 0;

  constructor(args: GameStartArgs, checkpointQ: number = 0) {
    this.level = makeLevel(args.level);
    this.onEvent = args.onEvent;
    this.limitedLives = args.limitedLives;
    this.initialCheckpointQ = checkpointQ;
    this.player = {
      pos: { x: 80 + checkpointQ * 120, y: 100 },
      vel: { x: 0, y: 0 },
      w: PLAYER_W,
      h: PLAYER_H,
      onGround: false,
      facing: 1,
      character: args.character,
      invincibleTicks: 30,
      lives: args.lives,
      prayers: 0,
    };
    this.stats = {
      level: args.level,
      gargoylesDefeated: 0,
      correct: 0,
      incorrect: 0,
      score: 0,
      timeSeconds: 0,
    };
    this.spawnGargoyles(args.gargoyleCount);
    this.spawnBibles(args.bibleCount);
    this.spawnPens(args.questionCount, checkpointQ);
    if (this.level.hasBoss) this.spawnBoss();
  }

  // ---------- spawners ----------
  private spawnGargoyles(n: number) {
    const minX = 400;
    const maxX = this.level.width - 300;
    const step = (maxX - minX) / Math.max(1, n);
    for (let i = 0; i < n; i++) {
      const x = minX + step * i + (Math.random() * 60 - 30);
      this.gargoyles.push({
        id: uid(),
        pos: { x, y: this.level.groundY - GARGOYLE_H },
        vel: { x: Math.random() < 0.5 ? -0.8 : 0.8, y: 0 },
        w: GARGOYLE_W,
        h: GARGOYLE_H,
        alive: true,
        throwCooldown: 60 + Math.floor(Math.random() * 60),
        explodeTicks: 0,
        amenTicks: 0,
        canJump: false,
      });
    }
  }

  private spawnBoss() {
    // Positioned near the end of castle level
    this.gargoyles.push({
      id: uid(),
      pos: { x: this.level.width - 350, y: this.level.groundY - BOSS_H },
      vel: { x: 0, y: 0 },
      w: BOSS_W,
      h: BOSS_H,
      alive: true,
      throwCooldown: 90,
      explodeTicks: 0,
      amenTicks: 0,
      canJump: true,
      isBoss: true,
      bossHp: 3,
      onGround: true,
      jumpCooldown: 120,
    });
  }

  private spawnBibles(n: number) {
    const minX = 300;
    const maxX = this.level.width - 300;
    const step = (maxX - minX) / Math.max(1, n);
    for (let i = 0; i < n; i++) {
      const x = minX + step * i + 40;
      const y = this.level.groundY - 120 - Math.random() * 80;
      this.pickups.push({
        id: uid(),
        pos: { x, y },
        w: PICKUP_W,
        h: PICKUP_H,
        alive: true,
        kind: "bible",
        bob: Math.random() * Math.PI * 2,
      });
    }
  }

  private spawnPens(n: number, checkpointQ: number) {
    const minX = 250;
    const maxX = this.level.width - 250;
    const step = (maxX - minX) / Math.max(1, n);
    for (let i = 0; i < n; i++) {
      if (i < checkpointQ) continue; // skip already-answered
      const x = minX + step * i + step / 2;
      const y = this.level.groundY - 80 - (i % 2 === 0 ? 60 : 10);
      this.pickups.push({
        id: uid(),
        pos: { x, y },
        w: PICKUP_W,
        h: PICKUP_H,
        alive: true,
        kind: "penpaper",
        questionIndex: i,
        bob: Math.random() * Math.PI * 2,
      });
    }
  }

  // ---------- input ----------
  setInput(i: Partial<InputState>) {
    this.input = { ...this.input, ...i };
  }

  // ---------- external API after trivia ----------
  grantPrayers(n: number) {
    this.player.prayers = Math.min(9, this.player.prayers + n);
  }

  recordAnswer(correct: boolean, points: number) {
    if (correct) {
      this.stats.correct++;
      this.stats.score += points;
    } else {
      this.stats.incorrect++;
    }
    this.answeredQuestions++;
  }

  // ---------- update loop ----------
  update() {
    if (this.paused || this.ended) return;
    this.ticks++;
    this.stats.timeSeconds = Math.floor((Date.now() - this.startTs) / 1000);

    this.updatePlayer();
    this.updateGargoyles();
    this.updateProjectiles();
    this.updatePickups();
    this.updateParticles();
    this.updateCamera();
    this.checkLevelComplete();
  }

  // ---- Player ----
  private updatePlayer() {
    const p = this.player;
    if (p.invincibleTicks > 0) p.invincibleTicks--;

    const ax = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    p.vel.x = ax * MOVE_SPEED;
    if (ax !== 0) p.facing = ax > 0 ? 1 : -1;

    if (this.input.jump && p.onGround) {
      p.vel.y = JUMP_V;
      p.onGround = false;
    }

    p.vel.y = Math.min(16, p.vel.y + GRAVITY);

    // Horizontal move + collide
    p.pos.x += p.vel.x;
    p.pos.x = Math.max(0, Math.min(this.level.width - p.w, p.pos.x));

    // Vertical move + collide w/ platforms
    p.pos.y += p.vel.y;
    p.onGround = false;
    for (const plat of this.level.platforms) {
      if (rectsOverlap(p.pos.x, p.pos.y, p.w, p.h, plat.x, plat.y, plat.w, plat.h)) {
        if (p.vel.y > 0) {
          // landing
          p.pos.y = plat.y - p.h;
          p.vel.y = 0;
          p.onGround = true;
        } else if (p.vel.y < 0 && plat.kind === "ground") {
          p.pos.y = plat.y + plat.h;
          p.vel.y = 0;
        }
      }
    }
    if (p.pos.y > CANVAS_H + 80) this.kill();

    // Shoot prayer
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.input.shoot && p.prayers > 0 && this.shootCooldown === 0) {
      this.projectiles.push({
        id: uid(),
        pos: { x: p.pos.x + (p.facing === 1 ? p.w : -14), y: p.pos.y + 20 },
        vel: { x: PRAYER_SPEED * p.facing, y: -1 },
        w: 22,
        h: 16,
        alive: true,
        kind: "prayer",
      });
      p.prayers -= 1;
      this.shootCooldown = 18;
    }
  }

  private kill() {
    if (this.limitedLives) {
      this.player.lives -= 1;
    }
    this.player.invincibleTicks = INVINCIBLE_TICKS;
    this.onEvent({ type: "player_died" });
    if (this.limitedLives && this.player.lives <= 0) {
      this.ended = true;
      this.onEvent({ type: "game_over" });
      return;
    }
    // Respawn at last checkpoint (near last collected pen)
    this.player.pos.x = 80 + this.answeredQuestions * 120;
    this.player.pos.y = 100;
    this.player.vel = { x: 0, y: 0 };
  }

  // ---- Gargoyles ----
  private updateGargoyles() {
    for (const g of this.gargoyles) {
      if (!g.alive) {
        if (g.explodeTicks > 0) g.explodeTicks--;
        if (g.amenTicks > 0) g.amenTicks--;
        continue;
      }

      if (g.isBoss) {
        this.updateBoss(g);
      } else {
        // Basic gargoyle: patrol left/right, snap to ground
        g.pos.x += g.vel.x;
        if (g.pos.x < 200) {
          g.pos.x = 200;
          g.vel.x = Math.abs(g.vel.x);
        }
        if (g.pos.x > this.level.width - 200) {
          g.pos.x = this.level.width - 200;
          g.vel.x = -Math.abs(g.vel.x);
        }
        g.pos.y = this.level.groundY - g.h;

        // Throw a temptation when near player (within 420px)
        g.throwCooldown--;
        const dx = this.player.pos.x - g.pos.x;
        if (g.throwCooldown <= 0 && Math.abs(dx) < 480) {
          this.throwTemptation(g, dx);
          g.throwCooldown = 110 + Math.floor(Math.random() * 60);
        }
      }

      // Collide w/ player
      if (
        rectsOverlap(
          this.player.pos.x,
          this.player.pos.y,
          this.player.w,
          this.player.h,
          g.pos.x,
          g.pos.y,
          g.w,
          g.h,
        ) &&
        this.player.invincibleTicks <= 0
      ) {
        this.onEvent({ type: "player_hit" });
        this.kill();
      }
    }
  }

  private updateBoss(g: Gargoyle) {
    // Physics
    g.vel.y = Math.min(16, (g.vel.y || 0) + GRAVITY);
    g.pos.y += g.vel.y;
    const groundY = this.level.groundY - g.h;
    if (g.pos.y >= groundY) {
      g.pos.y = groundY;
      g.vel.y = 0;
      g.onGround = true;
    }
    // Move toward player slowly, but stay in back area
    const dx = this.player.pos.x - g.pos.x;
    const target = Math.max(this.level.width - 500, Math.min(this.level.width - 150, this.player.pos.x + 120));
    const diff = target - g.pos.x;
    g.vel.x = Math.sign(diff) * 0.8;
    g.pos.x += g.vel.x;

    // Jump occasionally
    g.jumpCooldown = (g.jumpCooldown ?? 0) - 1;
    if (g.onGround && (g.jumpCooldown ?? 0) <= 0 && Math.abs(dx) < 500) {
      g.vel.y = -11;
      g.onGround = false;
      g.jumpCooldown = 140;
    }

    // Throw homework airplanes
    g.throwCooldown--;
    if (g.throwCooldown <= 0) {
      const dir = dx < 0 ? -1 : 1;
      this.projectiles.push({
        id: uid(),
        pos: { x: g.pos.x + g.w / 2, y: g.pos.y + 20 },
        vel: { x: HOMEWORK_SPEED * dir, y: -2 },
        w: 24,
        h: 14,
        alive: true,
        kind: "homework",
      });
      // double shot for flair
      this.projectiles.push({
        id: uid(),
        pos: { x: g.pos.x + g.w / 2, y: g.pos.y + 30 },
        vel: { x: HOMEWORK_SPEED * 0.85 * dir, y: 0.5 },
        w: 24,
        h: 14,
        alive: true,
        kind: "homework",
      });
      g.throwCooldown = 80;
    }
  }

  private throwTemptation(g: Gargoyle, dx: number) {
    const dir = dx < 0 ? -1 : 1;
    const kind: Projectile["kind"] = Math.random() < 0.5 ? "temptation_can" : "temptation_controller";
    this.projectiles.push({
      id: uid(),
      pos: { x: g.pos.x + g.w / 2, y: g.pos.y + 8 },
      vel: { x: TEMPTATION_SPEED * dir, y: -3 },
      w: 20,
      h: 16,
      alive: true,
      kind,
    });
  }

  // ---- Projectiles ----
  private updateProjectiles() {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      proj.pos.x += proj.vel.x;
      if (proj.kind === "prayer") {
        // light gravity
        proj.pos.y += proj.vel.y;
        proj.vel.y += 0.05;
      } else if (proj.kind === "homework") {
        // paper airplane has slight wave
        proj.vel.y += 0.1;
        proj.pos.y += proj.vel.y;
      } else {
        // temptations arc
        proj.vel.y += 0.22;
        proj.pos.y += proj.vel.y;
      }

      // Off-screen
      if (proj.pos.x < -50 || proj.pos.x > this.level.width + 50 || proj.pos.y > CANVAS_H + 100) {
        proj.alive = false;
        continue;
      }

      // Collisions
      if (proj.kind === "prayer") {
        for (const g of this.gargoyles) {
          if (
            g.alive &&
            rectsOverlap(proj.pos.x, proj.pos.y, proj.w, proj.h, g.pos.x, g.pos.y, g.w, g.h)
          ) {
            proj.alive = false;
            this.hitGargoyle(g);
            break;
          }
        }
      } else {
        if (
          this.player.invincibleTicks <= 0 &&
          rectsOverlap(
            proj.pos.x,
            proj.pos.y,
            proj.w,
            proj.h,
            this.player.pos.x,
            this.player.pos.y,
            this.player.w,
            this.player.h,
          )
        ) {
          proj.alive = false;
          this.onEvent({ type: "player_hit" });
          this.kill();
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  private hitGargoyle(g: Gargoyle) {
    if (g.isBoss) {
      g.bossHp = (g.bossHp ?? 1) - 1;
      g.amenTicks = 30;
      this.spawnExplosion(g, 10);
      if (g.bossHp <= 0) {
        g.alive = false;
        g.explodeTicks = 60;
        g.amenTicks = 120;
        this.spawnExplosion(g, 40);
        this.stats.gargoylesDefeated++;
        this.bossDefeated = true;
        this.onEvent({ type: "gargoyle_defeated" });
      }
      return;
    }
    g.alive = false;
    g.explodeTicks = 45;
    g.amenTicks = 80;
    this.spawnExplosion(g, 22);
    this.stats.gargoylesDefeated++;
    this.onEvent({ type: "gargoyle_defeated" });
  }

  private spawnExplosion(g: Gargoyle, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        pos: { x: g.pos.x + g.w / 2, y: g.pos.y + g.h / 2 },
        vel: { x: (Math.random() - 0.5) * 7, y: (Math.random() - 1) * 6 },
        life: 40 + Math.random() * 20,
        color: ["#8a8a94", "#b5b5c2", "#5a5a66", "#ffd447"][Math.floor(Math.random() * 4)],
        size: 3 + Math.random() * 4,
      });
    }
  }

  // ---- Pickups ----
  private updatePickups() {
    for (const pk of this.pickups) {
      if (!pk.alive) continue;
      pk.bob += 0.08;
      const bobY = Math.sin(pk.bob) * 4;
      if (
        rectsOverlap(
          this.player.pos.x,
          this.player.pos.y,
          this.player.w,
          this.player.h,
          pk.pos.x,
          pk.pos.y + bobY,
          pk.w,
          pk.h,
        )
      ) {
        pk.alive = false;
        this.paused = true;
        if (pk.kind === "bible") this.onEvent({ type: "bible_collected" });
        else this.onEvent({ type: "pen_collected", questionIndex: pk.questionIndex ?? 0 });
      }
    }
  }

  resume() {
    this.paused = false;
  }

  // ---- Particles ----
  private updateParticles() {
    for (const p of this.particles) {
      p.vel.y += 0.35;
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      p.life--;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ---- Camera ----
  private updateCamera() {
    const target = this.player.pos.x - CANVAS_W / 2 + this.player.w / 2;
    this.camera.x += (target - this.camera.x) * 0.12;
    this.camera.x = Math.max(0, Math.min(this.level.width - CANVAS_W, this.camera.x));
  }

  // ---- Level End ----
  private checkLevelComplete() {
    if (this.ended) return;
    if (this.level.hasBoss) {
      if (this.bossDefeated && this.player.pos.x > this.level.width - 180) {
        this.finish("boss_defeated");
      }
    } else {
      if (this.player.pos.x >= this.level.goalX) {
        this.finish("level_complete");
      }
    }
  }

  private finish(which: "level_complete" | "boss_defeated") {
    this.ended = true;
    this.stats.timeSeconds = Math.floor((Date.now() - this.startTs) / 1000);
    this.onEvent({ type: which, stats: this.stats });
  }
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export { GRAVITY, MOVE_SPEED, JUMP_V, PLAYER_W, PLAYER_H, GARGOYLE_W, GARGOYLE_H };
