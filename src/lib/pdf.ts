"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { LEVEL_NAMES, letterGrade, PlayerState } from "./types";

export function downloadPlayerPdf(p: PlayerState) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(186, 12, 47);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 212, 71);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FINAL TIME — Player Report", 12, 15);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const createdAt = new Date(p.createdAt).toLocaleString();
  const updatedAt = new Date(p.updatedAt).toLocaleString();

  const totals = (p.levelResults || []).reduce(
    (acc, r) => ({
      correct: acc.correct + r.correct,
      attempts: acc.attempts + r.correct + r.incorrect,
      gargoyles: acc.gargoyles + r.gargoylesDefeated,
    }),
    { correct: 0, attempts: 0, gargoyles: 0 },
  );
  const pct = totals.attempts > 0 ? (totals.correct / totals.attempts) * 100 : 0;
  const grade = totals.attempts > 0 ? letterGrade(pct) : "—";

  const summary = [
    ["Email", p.email],
    ["Character", p.character ?? "—"],
    ["Total Score", String(p.totalScore)],
    ["Letter Grade", grade],
    ["Accuracy", `${pct.toFixed(1)}%`],
    ["Current Level", `${p.currentLevel}. ${LEVEL_NAMES[p.currentLevel]}`],
    [
      "Checkpoint",
      `Level ${p.checkpointLevel} (${LEVEL_NAMES[p.checkpointLevel]}) · Question ${p.checkpointQuestionIndex}`,
    ],
    ["Lives Remaining", String(p.lives)],
    ["Gargoyles Defeated", String(totals.gargoyles)],
    ["Account Created", createdAt],
    ["Last Updated", updatedAt],
  ];

  autoTable(doc, {
    startY: 30,
    head: [["Stat", "Value"]],
    body: summary,
    theme: "grid",
    headStyles: { fillColor: [11, 27, 58], textColor: [255, 212, 71] },
  });

  const results = (p.levelResults || []).map((r) => [
    `${r.level}. ${LEVEL_NAMES[r.level]}`,
    String(r.score),
    `${r.correct}/${r.correct + r.incorrect}`,
    String(r.gargoylesDefeated),
    `${r.timeSeconds}s`,
    new Date(r.completedAt).toLocaleString(),
  ]);

  autoTable(doc, {
    // @ts-expect-error - lastAutoTable typing gap in jspdf-autotable
    startY: (doc.lastAutoTable?.finalY ?? 30) + 10,
    head: [["Level", "Score", "Correct", "Gargoyles", "Time", "Completed"]],
    body: results.length > 0 ? results : [["—", "—", "—", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: [186, 12, 47], textColor: [255, 255, 255] },
  });

  const filename = `final-time-${p.email.replace(/[^a-z0-9]/gi, "_")}.pdf`;
  doc.save(filename);
}
