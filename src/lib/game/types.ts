import { Character, LevelId } from "@/lib/types";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Player {
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  onGround: boolean;
  facing: 1 | -1;
  character: Character;
  invincibleTicks: number;
  lives: number;
  prayers: number;
}

export interface Gargoyle {
  id: number;
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  alive: boolean;
  throwCooldown: number;
  explodeTicks: number; // >0 means exploding
  amenTicks: number; // floating AMEN above corpse
  canJump: boolean;
  isBoss?: boolean;
  bossHp?: number;
  onGround?: boolean;
  jumpCooldown?: number;
  // When the teacher boss is defeated he doesn't explode — he sits down
  // and drinks a Diet Mountain Dew. This flag marks that animation state
  // so the renderer can keep drawing him in a happy seated pose and
  // animate a periodic sip cycle.
  sitting?: boolean;
  sipTicks?: number;
  // When a gargoyle is defeated by a prayer projectile it doesn't crumble
  // — it floats up as a transparent angel. `ascending` toggles the
  // animation on and `ascendTicks` counts down to 0, at which point the
  // angel fully fades out. Stomps still use explodeTicks for a stone
  // crumble effect.
  ascending?: boolean;
  ascendTicks?: number;
}

export interface Projectile {
  id: number;
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  alive: boolean;
  kind: "temptation_can" | "temptation_controller" | "prayer" | "homework";
  // For prayers: the x-position where the projectile was fired so the
  // engine can kill it after it travels beyond its effective range.
  spawnX?: number;
}

export interface Pickup {
  id: number;
  pos: Vec2;
  w: number;
  h: number;
  alive: boolean;
  kind: "bible" | "penpaper";
  // For pen+paper pickups: which of the level's graded questions this one
  // opens (0-indexed).
  questionIndex?: number;
  bob: number; // for floating animation (pen+paper only)
  // Bible pickups are stone-tablet blocks that the player head-bumps.
  // Once hit they stay in the world but switch to a gray "used" look
  // and stop triggering trivia. Pen+paper pickups ignore this flag.
  used?: boolean;
  // Frame counter for the block's "just got hit" animation (short upward
  // nudge before settling back into place). Only used by bible blocks.
  hitTicks?: number;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  color: string;
  size: number;
}

export interface Platform extends Rect {
  kind: "ground" | "platform";
}

export interface LevelData {
  id: LevelId;
  name: string;
  width: number; // total scroll length
  groundY: number; // y of ground top
  palette: LevelPalette;
  platforms: Platform[];
  goalX: number; // finish flag x
  hasBoss: boolean;
}

export interface LevelPalette {
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundTop: string;
  accent: string;
  farDeco: string;
  midDeco: string;
}

export type GameEvent =
  | { type: "bible_collected" }
  | { type: "pen_collected"; questionIndex: number }
  | { type: "player_died" }
  | { type: "player_hit" }
  | { type: "gargoyle_defeated" }
  | { type: "level_complete"; stats: LevelStats }
  | { type: "boss_defeated"; stats: LevelStats };

export interface LevelStats {
  level: LevelId;
  gargoylesDefeated: number;
  correct: number;
  incorrect: number;
  score: number;
  timeSeconds: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  shoot: boolean;
}
