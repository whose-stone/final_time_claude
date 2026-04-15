import { LevelId } from "@/lib/types";
import { LevelData, LevelPalette, Platform } from "./types";

const PALETTES: Record<LevelId, LevelPalette> = {
  1: {
    // Beach
    skyTop: "#87ceeb",
    skyBottom: "#fde2a6",
    ground: "#f4d28c",
    groundTop: "#ffe8a8",
    accent: "#2f8fd6",
    farDeco: "#a0d8ff",
    midDeco: "#e0b070",
  },
  2: {
    // Desert
    skyTop: "#f6c275",
    skyBottom: "#fff0c0",
    ground: "#d49a55",
    groundTop: "#e8b87a",
    accent: "#b84b1f",
    farDeco: "#c77c3c",
    midDeco: "#8a5a2b",
  },
  3: {
    // Forest
    skyTop: "#b7e4c7",
    skyBottom: "#e9f5db",
    ground: "#3b7a3a",
    groundTop: "#5aae45",
    accent: "#1f7a1f",
    farDeco: "#5ba85a",
    midDeco: "#2e6b2e",
  },
  4: {
    // Arctic
    skyTop: "#9ad2ff",
    skyBottom: "#eaf6ff",
    ground: "#cfe9ff",
    groundTop: "#ffffff",
    accent: "#2a78b8",
    farDeco: "#dff1ff",
    midDeco: "#9dc2df",
  },
  5: {
    // Castle
    skyTop: "#1a1a3a",
    skyBottom: "#3a1a4a",
    ground: "#3a3a46",
    groundTop: "#5a5a66",
    accent: "#aa2020",
    farDeco: "#2a2a4a",
    midDeco: "#1a1a2a",
  },
};

export const CANVAS_W = 960;
export const CANVAS_H = 540;
export const GROUND_Y = 460; // top of ground
export const LEVEL_WIDTH = 3200;

function makeGround(): Platform[] {
  return [
    { x: 0, y: GROUND_Y, w: LEVEL_WIDTH, h: CANVAS_H - GROUND_Y, kind: "ground" },
  ];
}

function platformSet(level: LevelId): Platform[] {
  const base = makeGround();
  const plats: Platform[] = [];
  const configsByLevel: Record<LevelId, Array<[number, number, number]>> = {
    1: [
      [500, 380, 120],
      [900, 320, 120],
      [1400, 360, 140],
      [1900, 300, 160],
      [2400, 370, 140],
    ],
    2: [
      [400, 370, 120],
      [800, 310, 100],
      [1100, 360, 120],
      [1600, 290, 160],
      [2100, 340, 140],
      [2600, 300, 120],
    ],
    3: [
      [450, 360, 120],
      [850, 300, 120],
      [1250, 340, 140],
      [1700, 290, 160],
      [2150, 340, 140],
      [2600, 300, 120],
    ],
    4: [
      [400, 380, 120],
      [800, 330, 100],
      [1200, 280, 140],
      [1700, 330, 140],
      [2200, 290, 160],
      [2650, 350, 120],
    ],
    5: [
      [400, 360, 120],
      [800, 320, 100],
      [1200, 360, 140],
      [1700, 310, 160],
      [2200, 360, 140],
      [2700, 310, 120],
    ],
  };
  for (const [x, y, w] of configsByLevel[level]) {
    plats.push({ x, y, w, h: 18, kind: "platform" });
  }
  return [...base, ...plats];
}

export function makeLevel(id: LevelId): LevelData {
  const names: Record<LevelId, string> = {
    1: "Beach",
    2: "Desert",
    3: "Forest",
    4: "Arctic",
    5: "Castle",
  };
  return {
    id,
    name: names[id],
    width: LEVEL_WIDTH,
    groundY: GROUND_Y,
    palette: PALETTES[id],
    platforms: platformSet(id),
    goalX: LEVEL_WIDTH - 120,
    hasBoss: id === 5,
  };
}
