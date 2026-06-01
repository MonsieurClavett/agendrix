/**
 * CSV helpers tuned for Excel FR :
 *   - séparateur `;` (locale FR)
 *   - virgule décimale
 *   - UTF-8 BOM en tête (`﻿`) pour qu'Excel détecte l'encoding
 *
 * Usage:
 *   const csv = buildCsv(["Employé", "Heures"], [["Bob", 38.5]]);
 *   // → "﻿Employé;Heures\nBob;38,50\n"
 */

/** Échappe un champ CSV : double les guillemets et entoure si nécessaire. */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  if (s.includes(";") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Convertit des minutes en heures décimales (ex. 90 → "1,50"). */
export function formatMinutesAsHours(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(2).replace(".", ",");
}

/** Convertit des minutes en heures signées (ex. -90 → "-1,50", 90 → "+1,50"). */
export function formatSignedMinutesAsHours(minutes: number): string {
  const sign = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  return `${sign}${formatMinutesAsHours(Math.abs(minutes))}`;
}

/**
 * Construit une string CSV complète prête à servir.
 * Préfixe le UTF-8 BOM pour qu'Excel lise correctement l'encoding.
 */
export function buildCsv(
  columns: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines: string[] = [];
  lines.push(columns.map(escapeCsvField).join(";"));
  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(";"));
  }
  return `﻿${lines.join("\n")}\n`;
}

/** Nom de fichier CSV daté (YYYY-MM-DD au YYYY-MM-DD). */
export function buildCsvFilename(
  prefix: string,
  startDate: Date,
  endDate: Date,
): string {
  const toIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return `${prefix}-${toIso(startDate)}-au-${toIso(endDate)}.csv`;
}
