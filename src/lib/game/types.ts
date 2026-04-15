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
}

export interface Projectile {
  id: number;
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  alive: boolean;
  kind: "temptation_can" | "temptation_controller" | "prayer" | "homework";
}

export interface Pickup {
  id: number;
  pos: Vec2;
  w: number;
  h: number;
  alive: boolean;
  kind: "bible" | "penpaper";
  questionIndex?: number; // for penpaper: which of the level questions (0..n-1)
  bob: number; // for floating animation
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
  | { type: "boss_defeated"; stats: LevelStats }
  | { type: "game_over" };

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
