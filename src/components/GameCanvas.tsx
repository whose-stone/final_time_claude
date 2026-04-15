"use client";

import { useEffect, useRef } from "react";
import { Game } from "@/lib/game/engine";
import { CANVAS_H, CANVAS_W } from "@/lib/game/levels";
import { render } from "@/lib/game/render";

interface Props {
  game: Game;
  paused: boolean;
}

export default function GameCanvas({ game, paused }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const keyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          game.setInput({ left: true });
          break;
        case "ArrowRight":
        case "d":
        case "D":
          game.setInput({ right: true });
          break;
        case " ":
        case "ArrowUp":
        case "w":
        case "W":
          game.setInput({ jump: true });
          break;
        case "f":
        case "F":
        case "Shift":
          game.setInput({ shoot: true });
          break;
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          game.setInput({ left: false });
          break;
        case "ArrowRight":
        case "d":
        case "D":
          game.setInput({ right: false });
          break;
        case " ":
        case "ArrowUp":
        case "w":
        case "W":
          game.setInput({ jump: false });
          break;
        case "f":
        case "F":
        case "Shift":
          game.setInput({ shoot: false });
          break;
      }
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    const loop = () => {
      if (!paused) game.update();
      render(ctx, game);
      if (paused) {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [game, paused]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        display: "block",
        margin: "0 auto",
        background: "#000",
        border: "4px solid #111",
        boxShadow: "6px 6px 0 #ba0c2f",
        imageRendering: "pixelated",
        width: "min(100%, 960px)",
        aspectRatio: `${CANVAS_W}/${CANVAS_H}`,
      }}
      tabIndex={0}
    />
  );
}
