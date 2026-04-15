import { Game } from "./engine";
import { CANVAS_H, CANVAS_W } from "./levels";
import { Gargoyle, LevelData, Particle, Pickup, Projectile } from "./types";
import { Character } from "@/lib/types";

export function render(ctx: CanvasRenderingContext2D, game: Game) {
  const { level, camera } = game;
  drawSky(ctx, level);
  drawParallax(ctx, level, camera.x);
  drawPlatforms(ctx, level, camera.x);
  drawGoal(ctx, level, camera.x);

  for (const pk of game.pickups) if (pk.alive) drawPickup(ctx, pk, camera.x);
  for (const g of game.gargoyles) drawGargoyle(ctx, g, camera.x);
  for (const proj of game.projectiles) if (proj.alive) drawProjectile(ctx, proj, camera.x);
  drawPlayer(ctx, game, camera.x);
  for (const p of game.particles) drawParticle(ctx, p, camera.x);

  // AMEN popups
  for (const g of game.gargoyles) {
    if (!g.alive && g.amenTicks > 0) drawAmen(ctx, g, camera.x);
  }
}

function drawSky(ctx: CanvasRenderingContext2D, level: LevelData) {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, level.palette.skyTop);
  grad.addColorStop(1, level.palette.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawParallax(ctx: CanvasRenderingContext2D, level: LevelData, camX: number) {
  // Background elements scroll slower (0.3x) to fake distance.
  const farX = -camX * 0.3;
  const midX = -camX * 0.6;

  ctx.save();
  ctx.fillStyle = level.palette.farDeco;
  // Far mountains / hills / clouds (variant per level by palette)
  for (let i = -1; i < 12; i++) {
    const baseX = farX + i * 280;
    if (level.id === 4) {
      drawIceberg(ctx, baseX + 60, 320, 200, 130, level.palette.farDeco);
    } else if (level.id === 5) {
      drawCastleSpire(ctx, baseX + 40, 220, 60, 200, level.palette.farDeco);
    } else {
      drawHill(ctx, baseX, 300, 320, 140, level.palette.farDeco);
    }
  }

  // Mid decor
  ctx.fillStyle = level.palette.midDeco;
  for (let i = -1; i < 16; i++) {
    const x = midX + i * 200;
    if (level.id === 1) drawPalm(ctx, x, 420, level.palette.midDeco, level.palette.groundTop);
    else if (level.id === 2) drawCactus(ctx, x + 40, 420, level.palette.midDeco);
    else if (level.id === 3) drawTree(ctx, x + 40, 420, level.palette.midDeco, level.palette.ground);
    else if (level.id === 4) drawPine(ctx, x + 40, 420, level.palette.midDeco);
    else drawTorch(ctx, x + 40, 420, level.palette.midDeco);
  }
  ctx.restore();
}

function drawHill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.quadraticCurveTo(x + w / 2, y - 20, x + w, y + h);
  ctx.closePath();
  ctx.fill();
}

function drawIceberg(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w * 0.3, y);
  ctx.lineTo(x + w * 0.6, y + 30);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}

function drawCastleSpire(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x + w / 2, y - 24);
  ctx.lineTo(x + w + 4, y);
  ctx.closePath();
  ctx.fill();
}

function drawPalm(ctx: CanvasRenderingContext2D, x: number, y: number, trunk: string, leaves: string) {
  ctx.fillStyle = "#7a4f28";
  ctx.fillRect(x, y - 50, 8, 50);
  ctx.fillStyle = "#2e9e3a";
  ctx.beginPath();
  ctx.ellipse(x + 4, y - 55, 28, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 14, y - 45, 24, 8, -0.4, 0, Math.PI * 2);
  ctx.ellipse(x + 22, y - 45, 24, 8, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCactus(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = "#2f7a2f";
  ctx.fillRect(x, y - 70, 14, 70);
  ctx.fillRect(x - 12, y - 40, 12, 26);
  ctx.fillRect(x + 14, y - 50, 12, 30);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, canopy: string, trunk: string) {
  ctx.fillStyle = "#5a3b1f";
  ctx.fillRect(x, y - 40, 12, 40);
  ctx.fillStyle = "#2f7a2f";
  ctx.beginPath();
  ctx.arc(x + 6, y - 50, 28, 0, Math.PI * 2);
  ctx.fill();
}

function drawPine(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = "#5a3b1f";
  ctx.fillRect(x + 10, y - 14, 6, 14);
  ctx.fillStyle = "#2a6033";
  ctx.beginPath();
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x + 13, y - 70);
  ctx.lineTo(x + 26, y - 14);
  ctx.closePath();
  ctx.fill();
}

function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(x + 8, y - 60, 6, 60);
  ctx.fillStyle = "#ff9f1c";
  ctx.beginPath();
  ctx.ellipse(x + 11, y - 66, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd447";
  ctx.beginPath();
  ctx.ellipse(x + 11, y - 68, 6, 10, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlatforms(ctx: CanvasRenderingContext2D, level: LevelData, camX: number) {
  for (const p of level.platforms) {
    const screenX = p.x - camX;
    if (screenX + p.w < 0 || screenX > CANVAS_W) continue;
    if (p.kind === "ground") {
      ctx.fillStyle = level.palette.ground;
      ctx.fillRect(screenX, p.y, p.w, p.h);
      ctx.fillStyle = level.palette.groundTop;
      ctx.fillRect(screenX, p.y, p.w, 8);
    } else {
      // Floating platform
      ctx.fillStyle = level.palette.groundTop;
      ctx.fillRect(screenX, p.y, p.w, p.h);
      ctx.fillStyle = level.palette.ground;
      ctx.fillRect(screenX, p.y + p.h - 4, p.w, 4);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, p.y, p.w, p.h);
    }
  }
}

function drawGoal(ctx: CanvasRenderingContext2D, level: LevelData, camX: number) {
  if (level.hasBoss) return;
  const x = level.goalX - camX;
  if (x < -80 || x > CANVAS_W + 80) return;
  // Flagpole
  ctx.fillStyle = "#444";
  ctx.fillRect(x, level.groundY - 160, 6, 160);
  // Flag
  ctx.fillStyle = "#ba0c2f";
  ctx.beginPath();
  ctx.moveTo(x + 6, level.groundY - 160);
  ctx.lineTo(x + 60, level.groundY - 144);
  ctx.lineTo(x + 6, level.groundY - 128);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffd447";
  ctx.font = 'bold 12px "Press Start 2P", monospace';
  ctx.fillText("ACU", x + 14, level.groundY - 142);
}

function drawPickup(ctx: CanvasRenderingContext2D, pk: Pickup, camX: number) {
  const x = pk.pos.x - camX;
  const bobY = Math.sin(pk.bob) * 4;
  const y = pk.pos.y + bobY;
  if (pk.kind === "bible") {
    // Glow
    ctx.fillStyle = "rgba(255, 212, 71, 0.4)";
    ctx.beginPath();
    ctx.arc(x + pk.w / 2, y + pk.h / 2, 22, 0, Math.PI * 2);
    ctx.fill();
    // Book
    ctx.fillStyle = "#5a2a2a";
    ctx.fillRect(x, y, pk.w, pk.h);
    ctx.fillStyle = "#ba0c2f";
    ctx.fillRect(x + 2, y + 2, pk.w - 4, pk.h - 4);
    ctx.fillStyle = "#ffd447";
    ctx.fillRect(x + pk.w / 2 - 1, y + 4, 2, pk.h - 8);
    ctx.fillRect(x + pk.w / 2 - 5, y + pk.h / 2 - 1, 10, 2);
  } else {
    // Pen + paper
    ctx.fillStyle = "rgba(180, 210, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(x + pk.w / 2, y + pk.h / 2, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, pk.w, pk.h);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(x, y, pk.w, pk.h);
    ctx.fillStyle = "#888";
    ctx.fillRect(x + 4, y + 6, pk.w - 8, 2);
    ctx.fillRect(x + 4, y + 12, pk.w - 8, 2);
    ctx.fillRect(x + 4, y + 18, pk.w - 12, 2);
    // Pen
    ctx.fillStyle = "#ba0c2f";
    ctx.save();
    ctx.translate(x + pk.w - 6, y + 6);
    ctx.rotate(-0.6);
    ctx.fillRect(0, 0, 4, 20);
    ctx.fillStyle = "#ffd447";
    ctx.fillRect(0, 16, 4, 6);
    ctx.restore();
  }
}

function drawGargoyle(ctx: CanvasRenderingContext2D, g: Gargoyle, camX: number) {
  const x = g.pos.x - camX;
  const y = g.pos.y;
  // The teacher boss is a human, not a stone gargoyle — keep him drawn even
  // after defeat so players can watch him sit down and sip a Mountain Dew.
  if (g.isBoss) {
    if (!g.alive && !g.sitting) return;
    drawBoss(ctx, x, y, g);
    return;
  }
  if (!g.alive && g.explodeTicks <= 0) return;
  if (!g.alive && g.explodeTicks > 0) return; // particles are drawn elsewhere; suppress body

  // Basic gargoyle: grey stone with red eyes
  ctx.fillStyle = "#4a4a56";
  ctx.fillRect(x + 4, y + 8, g.w - 8, g.h - 12);
  ctx.fillStyle = "#6a6a78";
  ctx.fillRect(x + 6, y + 10, g.w - 12, 6);
  // Wings
  ctx.fillStyle = "#2a2a33";
  ctx.beginPath();
  ctx.moveTo(x, y + 14);
  ctx.lineTo(x - 8, y + 4);
  ctx.lineTo(x + 6, y + 22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + g.w, y + 14);
  ctx.lineTo(x + g.w + 8, y + 4);
  ctx.lineTo(x + g.w - 6, y + 22);
  ctx.closePath();
  ctx.fill();
  // Head horns
  ctx.fillStyle = "#3a3a44";
  ctx.fillRect(x + 6, y + 0, 6, 8);
  ctx.fillRect(x + g.w - 12, y + 0, 6, 8);
  // Eyes
  ctx.fillStyle = "#ff2020";
  ctx.fillRect(x + 10, y + 14, 4, 4);
  ctx.fillRect(x + g.w - 14, y + 14, 4, 4);
  // Mouth (snarl)
  ctx.fillStyle = "#000";
  ctx.fillRect(x + 12, y + 22, g.w - 24, 3);
  // Feet
  ctx.fillStyle = "#3a3a44";
  ctx.fillRect(x + 6, y + g.h - 4, 10, 4);
  ctx.fillRect(x + g.w - 16, y + g.h - 4, 10, 4);
}

function drawBoss(ctx: CanvasRenderingContext2D, x: number, y: number, g: Gargoyle) {
  // Chubby bearded teacher with glasses. Two states:
  //  - standing & throwing homework (while alive)
  //  - sitting down, smiling, and drinking a Diet Mountain Dew (after defeat)
  if (g.sitting) {
    drawSeatedTeacher(ctx, x, y, g);
  } else {
    drawStandingTeacher(ctx, x, y, g);
  }

  // HP bar only while standing
  if (g.alive) {
    const hpMax = 3;
    const hp = g.bossHp ?? 0;
    ctx.fillStyle = "#000";
    ctx.fillRect(x - 4, y - 18, g.w + 8, 10);
    ctx.fillStyle = "#ba0c2f";
    ctx.fillRect(x - 2, y - 16, ((g.w + 4) * hp) / hpMax, 6);
  }
}

// -------- Teacher (boss) sprites --------

const SKIN = "#f3cfa5";
const SKIN_SHADE = "#d8a97b";
const SHIRT = "#4a6aaa";
const SHIRT_SHADE = "#2f4c86";
const TIE = "#ba0c2f";
const TIE_KNOT = "#8a001f";
const PANTS = "#2a2a33";
const PANTS_SHADE = "#14141a";
const BEARD = "#3a2619";
const HAIR = "#5a3a22";
const LENS = "rgba(180, 215, 255, 0.45)";

function drawStandingTeacher(ctx: CanvasRenderingContext2D, x: number, y: number, g: Gargoyle) {
  // Boss box is 70w × 80h. Draw a proportionate man: head, neck, torso,
  // chubby belly, pants, shoes, two arms (one holds a stack of homework).
  const HEAD_W = 32;
  const HEAD_X = x + (g.w - HEAD_W) / 2;
  const HEAD_Y = y + 2;
  const HEAD_H = 26;

  // --- Legs & shoes ---
  ctx.fillStyle = PANTS;
  ctx.fillRect(x + 14, y + 62, 14, 16); // left leg
  ctx.fillRect(x + g.w - 28, y + 62, 14, 16); // right leg
  ctx.fillStyle = PANTS_SHADE;
  ctx.fillRect(x + 14, y + 62, 14, 2);
  ctx.fillRect(x + g.w - 28, y + 62, 14, 2);
  ctx.fillStyle = "#111";
  ctx.fillRect(x + 12, y + 76, 18, 4);
  ctx.fillRect(x + g.w - 30, y + 76, 18, 4);

  // --- Torso / chubby belly ---
  // Torso widens below the shoulders to look "chubby".
  ctx.fillStyle = SHIRT;
  ctx.fillRect(x + 8, y + 32, g.w - 16, 30); // main shirt
  ctx.fillRect(x + 4, y + 40, g.w - 8, 22); // belly bulge
  ctx.fillStyle = SHIRT_SHADE;
  ctx.fillRect(x + 4, y + 58, g.w - 8, 4); // belt shadow
  // Belt
  ctx.fillStyle = "#201810";
  ctx.fillRect(x + 4, y + 60, g.w - 8, 4);
  ctx.fillStyle = "#e0a200";
  ctx.fillRect(x + g.w / 2 - 3, y + 60, 6, 4); // buckle

  // --- Collar + tie ---
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + g.w / 2 - 8, y + 28, 16, 6); // collar
  ctx.fillStyle = TIE_KNOT;
  ctx.fillRect(x + g.w / 2 - 4, y + 32, 8, 4); // knot
  ctx.fillStyle = TIE;
  ctx.beginPath();
  ctx.moveTo(x + g.w / 2 - 4, y + 36);
  ctx.lineTo(x + g.w / 2 + 4, y + 36);
  ctx.lineTo(x + g.w / 2 + 6, y + 54);
  ctx.lineTo(x + g.w / 2, y + 58);
  ctx.lineTo(x + g.w / 2 - 6, y + 54);
  ctx.closePath();
  ctx.fill();

  // --- Arms ---
  // Left arm (as viewed)
  ctx.fillStyle = SHIRT;
  ctx.fillRect(x - 2, y + 32, 10, 22);
  ctx.fillStyle = SKIN;
  ctx.fillRect(x, y + 52, 8, 10); // forearm/hand
  // Right arm (holds homework)
  ctx.fillStyle = SHIRT;
  ctx.fillRect(x + g.w - 8, y + 32, 10, 18);
  ctx.fillStyle = SKIN;
  ctx.fillRect(x + g.w - 6, y + 48, 8, 10);
  // Stack of homework paper in right hand
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + g.w - 2, y + 50, 10, 6);
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + g.w - 2, y + 50, 10, 6);
  ctx.fillStyle = "#aaa";
  ctx.fillRect(x + g.w, y + 52, 6, 1);
  ctx.fillRect(x + g.w, y + 54, 6, 1);

  // --- Neck ---
  ctx.fillStyle = SKIN_SHADE;
  ctx.fillRect(x + g.w / 2 - 5, y + 26, 10, 6);

  // --- Head ---
  drawHead(ctx, HEAD_X, HEAD_Y, HEAD_W, HEAD_H, "angry");
}

function drawSeatedTeacher(ctx: CanvasRenderingContext2D, x: number, y: number, g: Gargoyle) {
  // Sit him on the ground: legs forward, back slightly hunched. He holds a
  // Diet Mountain Dew can in his right hand and brings it up to his lips on
  // a slow sip cycle. sipTicks counts up; cycle length ~120 ticks.
  const sipCycle = 120;
  const sipT = (g.sipTicks ?? 0) % sipCycle;
  const sipping = sipT > 70 && sipT < 100;
  const HEAD_W = 32;
  const HEAD_X = x + (g.w - HEAD_W) / 2;
  const HEAD_Y = y + 16;
  const HEAD_H = 26;

  // Ground line baseline is at y + g.h - 2 (just above feet).
  // --- Legs stretched forward ---
  ctx.fillStyle = PANTS;
  // Upper leg chunks (sitting so thighs are vertical-ish, calves forward)
  ctx.fillRect(x + 14, y + 60, 16, 14); // left thigh stub
  ctx.fillRect(x + g.w - 30, y + 60, 16, 14); // right thigh stub
  // Calves stretched out forward past the body (outside x range)
  ctx.fillRect(x + 20, y + 70, 30, 10); // left calf forward
  ctx.fillRect(x + g.w - 50, y + 70, 30, 10); // right calf forward
  // Shoes at the end of the stretched calves
  ctx.fillStyle = "#111";
  ctx.fillRect(x + 46, y + 70, 12, 10);
  ctx.fillRect(x + g.w - 22, y + 70, 12, 10);

  // --- Torso (slightly hunched while sitting) ---
  ctx.fillStyle = SHIRT;
  ctx.fillRect(x + 6, y + 36, g.w - 12, 30);
  ctx.fillRect(x + 2, y + 46, g.w - 4, 20); // belly bulge
  ctx.fillStyle = SHIRT_SHADE;
  ctx.fillRect(x + 2, y + 62, g.w - 4, 4);

  // Belt
  ctx.fillStyle = "#201810";
  ctx.fillRect(x + 2, y + 64, g.w - 4, 4);
  ctx.fillStyle = "#e0a200";
  ctx.fillRect(x + g.w / 2 - 3, y + 64, 6, 4);

  // --- Collar + tie (loosened while relaxing) ---
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + g.w / 2 - 8, y + 34, 16, 5);
  ctx.fillStyle = TIE_KNOT;
  ctx.fillRect(x + g.w / 2 - 2, y + 38, 4, 3); // loose knot off-center
  ctx.fillStyle = TIE;
  ctx.beginPath();
  ctx.moveTo(x + g.w / 2 - 2, y + 41);
  ctx.lineTo(x + g.w / 2 + 2, y + 41);
  ctx.lineTo(x + g.w / 2 + 8, y + 56);
  ctx.lineTo(x + g.w / 2 + 3, y + 60);
  ctx.closePath();
  ctx.fill();

  // --- Left arm resting on lap ---
  ctx.fillStyle = SHIRT;
  ctx.fillRect(x, y + 40, 10, 18);
  ctx.fillStyle = SKIN;
  ctx.fillRect(x + 4, y + 56, 8, 8);

  // --- Right arm: holds Diet Mtn Dew, raising it to mouth on sip ---
  // When sipping, the hand+can move up next to head. Otherwise rests by belly.
  const armBaseX = x + g.w - 10;
  const armBaseY = y + 38;
  const canRestX = x + g.w - 2;
  const canRestY = y + 56;
  const canSipX = HEAD_X + HEAD_W - 8;
  const canSipY = HEAD_Y + 12;
  const canX = sipping ? canSipX : canRestX;
  const canY = sipping ? canSipY : canRestY;
  // Upper arm
  ctx.fillStyle = SHIRT;
  ctx.fillRect(armBaseX, armBaseY, 10, 16);
  // Forearm (rotated toward can)
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(armBaseX + 5, armBaseY + 14);
  ctx.lineTo(canX + 4, canY + 10);
  ctx.stroke();
  // Hand
  ctx.fillStyle = SKIN_SHADE;
  ctx.fillRect(canX - 2, canY + 8, 10, 6);

  // --- Diet Mountain Dew can ---
  drawMtnDew(ctx, canX, canY);

  // --- Neck ---
  ctx.fillStyle = SKIN_SHADE;
  ctx.fillRect(x + g.w / 2 - 5, y + HEAD_Y - y + HEAD_H - 2, 10, 6);

  // --- Head (smiling) ---
  drawHead(ctx, HEAD_X, HEAD_Y, HEAD_W, HEAD_H, sipping ? "sipping" : "smiling");

  // Little "Ahh" speech every cycle, briefly
  if (sipT > 100 && sipT < 112) {
    ctx.save();
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.fillStyle = "#0b1b3a";
    ctx.strokeStyle = "#ffd447";
    ctx.lineWidth = 3;
    ctx.textAlign = "center";
    ctx.strokeText("AHH!", HEAD_X + HEAD_W / 2, HEAD_Y - 8);
    ctx.fillText("AHH!", HEAD_X + HEAD_W / 2, HEAD_Y - 8);
    ctx.restore();
  }
}

type HeadMood = "angry" | "smiling" | "sipping";

function drawHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  mood: HeadMood,
) {
  // Face
  ctx.fillStyle = SKIN;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = SKIN_SHADE;
  ctx.fillRect(x, y + h - 3, w, 3); // jawline shadow

  // Bald-ish top with fringe on sides
  ctx.fillStyle = HAIR;
  ctx.fillRect(x - 2, y - 2, w + 4, 5); // hairline
  ctx.fillRect(x - 2, y, 4, 12); // left temple
  ctx.fillRect(x + w - 2, y, 4, 12); // right temple

  // Ears
  ctx.fillStyle = SKIN_SHADE;
  ctx.fillRect(x - 3, y + 10, 3, 6);
  ctx.fillRect(x + w, y + 10, 3, 6);

  // Eyebrows
  ctx.fillStyle = "#2a1a0a";
  if (mood === "angry") {
    // Angled inward
    ctx.fillRect(x + 5, y + 7, 8, 2);
    ctx.fillRect(x + w - 13, y + 7, 8, 2);
    ctx.fillRect(x + 11, y + 6, 3, 2);
    ctx.fillRect(x + w - 14, y + 6, 3, 2);
  } else {
    ctx.fillRect(x + 5, y + 8, 8, 2);
    ctx.fillRect(x + w - 13, y + 8, 8, 2);
  }

  // Glasses
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.fillStyle = LENS;
  ctx.fillRect(x + 4, y + 10, 9, 7);
  ctx.strokeRect(x + 4, y + 10, 9, 7);
  ctx.fillRect(x + w - 13, y + 10, 9, 7);
  ctx.strokeRect(x + w - 13, y + 10, 9, 7);
  // Bridge
  ctx.beginPath();
  ctx.moveTo(x + 13, y + 13);
  ctx.lineTo(x + w - 13, y + 13);
  ctx.stroke();

  // Nose
  ctx.fillStyle = SKIN_SHADE;
  ctx.fillRect(x + w / 2 - 1, y + 14, 2, 4);

  // Beard (wraps jaw)
  ctx.fillStyle = BEARD;
  ctx.fillRect(x - 1, y + 17, w + 2, h - 17);
  // Moustache
  ctx.fillRect(x + 6, y + 17, w - 12, 3);

  // Mouth region (sit inside beard)
  if (mood === "angry") {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x + w / 2 - 6, y + 22, 12, 3); // flat frown-ish
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(x + w / 2 - 8, y + 25, 16, 2); // shadow
  } else if (mood === "smiling") {
    // Happy upward curve
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 21, 6, 0.1, Math.PI - 0.1);
    ctx.stroke();
    // Teeth glimmer
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + w / 2 - 4, y + 22, 8, 2);
  } else {
    // Sipping — pursed mouth around can
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 22, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cheeks (rosy when smiling or sipping)
  if (mood !== "angry") {
    ctx.fillStyle = "rgba(220, 80, 80, 0.35)";
    ctx.fillRect(x + 3, y + 18, 5, 3);
    ctx.fillRect(x + w - 8, y + 18, 5, 3);
  }
}

function drawMtnDew(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Diet Mountain Dew can (pale-yellow / silver, green stripe).
  // The SDK-canvas can-art is intentionally simplified/stylized.
  const w = 10;
  const h = 20;
  // Body
  ctx.fillStyle = "#efe77a";
  ctx.fillRect(x, y, w, h);
  // Silver top lid
  ctx.fillStyle = "#cfcfcf";
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = "#8a8a8a";
  ctx.fillRect(x, y + 2, w, 1);
  // Pull tab
  ctx.fillStyle = "#dcdcdc";
  ctx.fillRect(x + 2, y, 3, 2);
  // Green diagonal stripe (Mtn Dew swoosh)
  ctx.fillStyle = "#6fbf3a";
  ctx.beginPath();
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x + w, y + 4);
  ctx.lineTo(x + w, y + 10);
  ctx.lineTo(x, y + 14);
  ctx.closePath();
  ctx.fill();
  // "DMD" label
  ctx.fillStyle = "#0a3b1a";
  ctx.font = 'bold 6px "Press Start 2P", monospace';
  ctx.fillText("DMD", x + 1, y + 18);
  // Outline
  ctx.strokeStyle = "#5a5a2a";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile, camX: number) {
  const x = p.pos.x - camX;
  const y = p.pos.y;
  switch (p.kind) {
    case "prayer": {
      // Golden praying hands
      ctx.fillStyle = "rgba(255, 212, 71, 0.5)";
      ctx.beginPath();
      ctx.arc(x + p.w / 2, y + p.h / 2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd447";
      // simple hands silhouette
      ctx.fillRect(x + 4, y + 2, 6, 12);
      ctx.fillRect(x + 12, y + 2, 6, 12);
      ctx.fillStyle = "#e0a200";
      ctx.fillRect(x + 6, y, 3, 4);
      ctx.fillRect(x + 13, y, 3, 4);
      break;
    }
    case "temptation_can": {
      // Beer can
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(x, y, p.w, p.h);
      ctx.fillStyle = "#b03030";
      ctx.fillRect(x + 2, y + 4, p.w - 4, 6);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 6px monospace";
      ctx.fillText("BEER", x + 1, y + 10);
      break;
    }
    case "temptation_controller": {
      // Game controller
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(x, y + 3, p.w, p.h - 6);
      ctx.fillStyle = "#ba0c2f";
      ctx.fillRect(x + 2, y + 5, 4, 4);
      ctx.fillStyle = "#2f6fd6";
      ctx.fillRect(x + p.w - 6, y + 5, 4, 4);
      ctx.fillStyle = "#666";
      ctx.fillRect(x - 2, y + 6, 4, 6);
      ctx.fillRect(x + p.w - 2, y + 6, 4, 6);
      break;
    }
    case "homework": {
      // Paper airplane
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      const dir = p.vel.x < 0 ? -1 : 1;
      if (dir === 1) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + p.w, y + p.h / 2);
        ctx.lineTo(x, y + p.h);
        ctx.lineTo(x + 8, y + p.h / 2);
      } else {
        ctx.moveTo(x + p.w, y);
        ctx.lineTo(x, y + p.h / 2);
        ctx.lineTo(x + p.w, y + p.h);
        ctx.lineTo(x + p.w - 8, y + p.h / 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, game: Game, camX: number) {
  const p = game.player;
  const x = p.pos.x - camX;
  const y = p.pos.y;
  const blink = p.invincibleTicks > 0 && Math.floor(p.invincibleTicks / 4) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.5;
  drawFirebird(ctx, x, y, p.w, p.h, p.character, p.facing);
  ctx.globalAlpha = 1;
}

function drawFirebird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  character: Character,
  facing: 1 | -1,
) {
  ctx.save();
  if (facing === -1) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }
  // Flame mane
  ctx.fillStyle = "#ff5a00";
  ctx.fillRect(4, 0, 32, 4);
  ctx.fillStyle = "#ff9f1c";
  ctx.fillRect(10, -4, 20, 4);
  ctx.fillStyle = "#ffd447";
  ctx.fillRect(16, -7, 8, 3);
  if (character === "girl") {
    ctx.fillStyle = "#ff4d88";
    ctx.fillRect(28, -4, 8, 6);
  }
  // Head
  ctx.fillStyle = "#ba0c2f";
  ctx.fillRect(4, 4, 30, 16);
  // Beak
  ctx.fillStyle = "#ffd447";
  ctx.fillRect(32, 10, 8, 6);
  // Eye
  ctx.fillStyle = "#fff";
  ctx.fillRect(24, 8, 4, 4);
  ctx.fillStyle = "#000";
  ctx.fillRect(26, 10, 2, 2);
  // Body
  ctx.fillStyle = "#ba0c2f";
  ctx.fillRect(4, 20, 30, 20);
  ctx.fillStyle = "#ffd447";
  ctx.fillRect(10, 24, 18, 12);
  // Wing
  ctx.fillStyle = "#8a001f";
  ctx.fillRect(0, 22, 8, 12);
  // Legs
  ctx.fillStyle = "#ffd447";
  ctx.fillRect(8, 40, 6, 10);
  ctx.fillRect(22, 40, 6, 10);
  // Feet
  ctx.fillStyle = "#e0a200";
  ctx.fillRect(6, h - 4, 10, 4);
  ctx.fillRect(20, h - 4, 10, 4);
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, camX: number) {
  ctx.fillStyle = p.color;
  ctx.fillRect(p.pos.x - camX, p.pos.y, p.size, p.size);
}

function drawAmen(ctx: CanvasRenderingContext2D, g: Gargoyle, camX: number) {
  const x = g.pos.x - camX + g.w / 2;
  const lift = (80 - g.amenTicks) * 0.6;
  const y = g.pos.y - 10 - lift;
  ctx.save();
  ctx.font = 'bold 18px "Press Start 2P", monospace';
  ctx.fillStyle = "#ffd447";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.textAlign = "center";
  ctx.strokeText("AMEN!", x, y);
  ctx.fillText("AMEN!", x, y);
  ctx.restore();
}
