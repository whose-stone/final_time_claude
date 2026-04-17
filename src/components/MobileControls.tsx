"use client";

import { useCallback, useRef } from "react";
import { Game } from "@/lib/game/engine";

interface Props {
  game: Game;
}

export default function MobileControls({ game }: Props) {
  const prevent = (e: React.TouchEvent) => e.preventDefault();

  const press = useCallback(
    (key: "left" | "right" | "jump" | "shoot") => {
      game.setInput({ [key]: true });
    },
    [game],
  );

  const release = useCallback(
    (key: "left" | "right" | "jump" | "shoot") => {
      game.setInput({ [key]: false });
    },
    [game],
  );

  return (
    <div className="mobile-controls" onTouchStart={prevent}>
      {/* D-pad — left side */}
      <div className="dpad">
        <DpadBtn dir="up" onDown={() => press("jump")} onUp={() => release("jump")} />
        <div className="dpad-mid">
          <DpadBtn dir="left" onDown={() => press("left")} onUp={() => release("left")} />
          <div className="dpad-center" />
          <DpadBtn dir="right" onDown={() => press("right")} onUp={() => release("right")} />
        </div>
        <div className="dpad-down-spacer" />
      </div>

      {/* A / B buttons — right side */}
      <div className="ab-group">
        <ABBtn
          label="B"
          sub="PRAY"
          onDown={() => press("shoot")}
          onUp={() => release("shoot")}
        />
        <ABBtn
          label="A"
          sub="JUMP"
          onDown={() => press("jump")}
          onUp={() => release("jump")}
        />
      </div>

      <style jsx>{`
        .mobile-controls {
          display: none;
          max-width: 960px;
          margin: 0 auto;
          padding: 14px 18px 22px;
          background: #2a2a33;
          border: 4px solid #111;
          border-top: none;
          border-radius: 0 0 18px 18px;
          justify-content: space-between;
          align-items: center;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
        }
        @media (hover: none) and (pointer: coarse) {
          .mobile-controls {
            display: flex;
          }
        }
        .dpad {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .dpad-mid {
          display: flex;
          align-items: center;
          gap: 0;
        }
        .dpad-center {
          width: 46px;
          height: 46px;
          background: #3a3a44;
          border: 2px solid #222;
        }
        .dpad-down-spacer {
          width: 46px;
          height: 46px;
        }
        .ab-group {
          display: flex;
          align-items: flex-end;
          gap: 14px;
        }
      `}</style>
    </div>
  );
}

function DpadBtn({
  dir,
  onDown,
  onUp,
}: {
  dir: "up" | "left" | "right";
  onDown: () => void;
  onUp: () => void;
}) {
  const arrow = { up: "\u25B2", left: "\u25C0", right: "\u25B6" }[dir];
  const isVert = dir === "up";
  return (
    <button
      className="dpad-btn"
      onTouchStart={(e) => {
        e.preventDefault();
        onDown();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onUp();
      }}
      onTouchCancel={() => onUp()}
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      style={{
        width: isVert ? 46 : 46,
        height: isVert ? 46 : 46,
        background: "#4a4a56",
        border: "2px solid #222",
        color: "#ddd",
        fontSize: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 0,
        boxShadow: "none",
        padding: 0,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {arrow}
    </button>
  );
}

function ABBtn({
  label,
  sub,
  onDown,
  onUp,
}: {
  label: string;
  sub: string;
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <button
        onTouchStart={(e) => {
          e.preventDefault();
          onDown();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          onUp();
        }}
        onTouchCancel={() => onUp()}
        onMouseDown={onDown}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: label === "A" ? "#ba0c2f" : "#0b1b3a",
          border: "3px solid #111",
          color: "#ffd447",
          fontSize: 22,
          fontWeight: "bold",
          fontFamily: '"Press Start 2P", monospace',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "2px 3px 0 #000",
          padding: 0,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {label}
      </button>
      <span
        style={{
          color: "#888",
          fontSize: 8,
          fontFamily: '"Press Start 2P", monospace',
          letterSpacing: 1,
        }}
      >
        {sub}
      </span>
    </div>
  );
}
