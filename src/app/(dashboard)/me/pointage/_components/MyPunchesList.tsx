import { Badge } from "@/components/ui/badge";

type Session = {
  startsAt: Date;
  endsAt: Date | null;
  durationMinutes: number | null;
  locationName: string;
};

function formatHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const FRENCH_WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const FRENCH_MONTHS = [
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

function formatShortDate(d: Date): string {
  return `${FRENCH_WEEKDAYS[d.getDay()]} ${d.getDate()} ${FRENCH_MONTHS[d.getMonth()]}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function MyPunchesList({ sessions }: { sessions: Session[] }) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Poste</th>
            <th className="px-3 py-2 font-medium">Entrée</th>
            <th className="px-3 py-2 font-medium">Sortie</th>
            <th className="px-3 py-2 text-right font-medium">Durée</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, idx) => (
            <tr key={idx} className="border-t">
              <td className="px-3 py-2 font-medium">
                {formatShortDate(s.startsAt)}
              </td>
              <td className="text-muted-foreground px-3 py-2">
                {s.locationName}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {formatHHMM(s.startsAt)}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {s.endsAt ? formatHHMM(s.endsAt) : "—"}
              </td>
              <td className="px-3 py-2 text-right">
                {s.durationMinutes !== null ? (
                  <span className="font-semibold tabular-nums">
                    {formatDuration(s.durationMinutes)}
                  </span>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                    En cours
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
