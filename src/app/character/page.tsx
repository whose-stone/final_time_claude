"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { savePlayer } from "@/lib/db";
import { Character } from "@/lib/types";
import FirebirdSprite from "@/components/FirebirdSprite";

export default function CharacterPage() {
  const { user, player, loading, refreshPlayer } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [choice, setChoice] = useState<Character | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  async function pick(c: Character) {
    if (!player) return;
    setChoice(c);
    setSaving(true);
    await savePlayer({ ...player, character: c });
    await refreshPlayer();
    router.replace("/game");
  }

  return (
    <main className="center-screen">
      <div className="card" style={{ maxWidth: 720 }}>
        <h1 className="title">CHOOSE YOUR FIREBIRD</h1>
        <p className="subtitle">
          Pick the anamorphic Firebird who will battle through 5 levels of
          temptation. Go Firebirds!
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginTop: 12,
          }}
        >
          <CharacterCard
            label="BOY FIREBIRD"
            character="boy"
            selected={choice === "boy"}
            onClick={() => pick("boy")}
            disabled={saving}
          />
          <CharacterCard
            label="GIRL FIREBIRD"
            character="girl"
            selected={choice === "girl"}
            onClick={() => pick("girl")}
            disabled={saving}
          />
        </div>
      </div>
    </main>
  );
}

function CharacterCard({
  label,
  character,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  character: Character;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: selected ? "var(--acu-red)" : "var(--acu-cream)",
        color: selected ? "white" : "var(--ink)",
        border: "4px solid var(--ink)",
        borderRadius: 10,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        minHeight: 240,
      }}
    >
      <FirebirdSprite character={character} size={120} />
      <div style={{ fontSize: 16 }}>{label}</div>
    </button>
  );
}
