import { Badge } from "@/components/ui/badge";
import type { AuditLogRow } from "@/lib/repositories/auditLog";

const FRENCH_MONTHS_SHORT = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function formatTimestamp(d: Date): string {
  const day = d.getDate();
  const month = FRENCH_MONTHS_SHORT[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${hh}:${mm}`;
}

function payloadPreview(payload: unknown): string {
  if (payload === null || payload === undefined) return "";
  try {
    const s = JSON.stringify(payload);
    return s.length > 60 ? `${s.slice(0, 60)}…` : s;
  } catch {
    return "";
  }
}

export function AuditTable({
  rows,
  actionLabels,
}: {
  rows: AuditLogRow[];
  actionLabels: Record<string, string>;
}) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
            <th className="px-3 py-2 font-medium">Quand</th>
            <th className="px-3 py-2 font-medium">Qui</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Entité</th>
            <th className="px-3 py-2 font-medium">Détails</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="text-muted-foreground px-3 py-2 text-xs tabular-nums whitespace-nowrap">
                {formatTimestamp(r.createdAt)}
              </td>
              <td className="px-3 py-2 font-medium">{r.actorName}</td>
              <td className="px-3 py-2">
                <Badge variant="outline" className="font-mono text-[11px]">
                  {actionLabels[r.action] ?? r.action}
                </Badge>
              </td>
              <td className="text-muted-foreground px-3 py-2 text-xs">
                {r.entityType}
                {r.entityId && (
                  <span className="text-muted-foreground/70 ml-1 font-mono">
                    {r.entityId.slice(-6)}
                  </span>
                )}
              </td>
              <td className="text-muted-foreground px-3 py-2 text-xs font-mono">
                {payloadPreview(r.payload)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
