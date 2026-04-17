"use client";

import { Character } from "@/lib/types";

/**
 * A pixel-art Firebird drawn with inline SVG.
 * Boy vs Girl are distinguished by a bow on the girl. Both use the ACU crimson
 * & gold palette. The sprite is an anthropomorphic flaming bird mascot.
 */
export default function FirebirdSprite({
  character,
  size = 64,
  facing = "right",
}: {
  character: Character;
  size?: number;
  facing?: "right" | "left";
}) {
  const flip = facing === "left" ? -1 : 1;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      shapeRendering="crispEdges"
      style={{ transform: `scaleX(${flip})`, imageRendering: "pixelated" }}
    >
      {/* Flame mane */}
      <rect x="16" y="8" width="4" height="4" fill="#ff5a00" />
      <rect x="20" y="4" width="4" height="4" fill="#ff9f1c" />
      <rect x="24" y="2" width="4" height="2" fill="#ffd447" />
      <rect x="28" y="4" width="4" height="4" fill="#ff9f1c" />
      <rect x="32" y="8" width="4" height="4" fill="#ff5a00" />
      {character === "girl" && (
        <g>
          {/* Hair bow — two pink loops, darker knot, ribbon tails. Sits on
              top of the head centered over the flame mane so it reads as
              a little girl's bow tied in her "hair". */}
          {/* Ribbon tails behind the head */}
          <rect x="27" y="10" width="2" height="5" fill="#ff4d88" />
          <rect x="35" y="10" width="2" height="5" fill="#ff4d88" />
          <rect x="28" y="14" width="2" height="2" fill="#cc2e68" />
          <rect x="34" y="14" width="2" height="2" fill="#cc2e68" />
          {/* Left loop */}
          <rect x="20" y="2" width="10" height="8" fill="#ff4d88" />
          <rect x="20" y="8" width="10" height="2" fill="#cc2e68" />
          <rect x="21" y="3" width="3" height="2" fill="#ffb3cc" />
          {/* Right loop */}
          <rect x="34" y="2" width="10" height="8" fill="#ff4d88" />
          <rect x="34" y="8" width="10" height="2" fill="#cc2e68" />
          <rect x="40" y="3" width="3" height="2" fill="#ffb3cc" />
          {/* Knot */}
          <rect x="30" y="2" width="4" height="8" fill="#cc2e68" />
          <rect x="30" y="4" width="4" height="2" fill="#ff7aa2" />
          <rect x="31" y="3" width="2" height="1" fill="#ffd6e5" />
        </g>
      )}
      {/* Head */}
      <rect x="18" y="12" width="28" height="16" fill="#ba0c2f" />
      <rect x="22" y="12" width="20" height="2" fill="#e0324e" />
      {/* Beak */}
      <rect x="44" y="18" width="6" height="4" fill="#ffd447" />
      <rect x="46" y="22" width="4" height="2" fill="#e0a200" />
      {/* Eye */}
      <rect x="36" y="16" width="4" height="4" fill="#fff" />
      <rect x="38" y="18" width="2" height="2" fill="#000" />
      {/* Body */}
      <rect x="16" y="28" width="30" height="18" fill="#ba0c2f" />
      <rect x="16" y="28" width="30" height="2" fill="#e0324e" />
      {/* Chest */}
      <rect x="22" y="32" width="14" height="10" fill="#ffd447" />
      <rect x="26" y="34" width="2" height="2" fill="#ba0c2f" />
      <rect x="30" y="38" width="2" height="2" fill="#ba0c2f" />
      {/* Wing */}
      <rect x="10" y="32" width="8" height="10" fill="#8a001f" />
      <rect x="10" y="32" width="8" height="2" fill="#ba0c2f" />
      {/* Legs */}
      <rect x="20" y="46" width="6" height="8" fill="#ffd447" />
      <rect x="34" y="46" width="6" height="8" fill="#ffd447" />
      {/* Feet */}
      <rect x="18" y="54" width="10" height="4" fill="#e0a200" />
      <rect x="32" y="54" width="10" height="4" fill="#e0a200" />
    </svg>
  );
}
