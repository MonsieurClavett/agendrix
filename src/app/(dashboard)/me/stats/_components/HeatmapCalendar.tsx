import { cn } from "@/lib/utils";

type Point = { date: string; workedMinutes: number };

function levelFor(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 4 * 60) return 1;
  if (minutes < 7 * 60) return 2;
  if (minutes < 10 * 60) return 3;
  return 4;
}

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-muted",
  1: "bg-cyan-200 dark:bg-cyan-900/60",
  2: "bg-cyan-400 dark:bg-cyan-700",
  3: "bg-cyan-600 dark:bg-cyan-600",
  4: "bg-cyan-800 dark:bg-cyan-500",
};

function formatTooltip(p: Point): string {
  const hours = (p.workedMinutes / 60).toFixed(1).replace(".", ",");
  const d = new Date(`${p.date}T00:00:00`);
  const day = d.getDate();
  const months = [
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
  return `${day} ${months[d.getMonth()]} · ${hours}h`;
}

export function HeatmapCalendar({ points }: { points: Point[] }) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex flex-wrap gap-1">
        {points.map((p) => {
          const lvl = levelFor(p.workedMinutes);
          return (
            <span
              key={p.date}
              title={formatTooltip(p)}
              className={cn(
                "inline-block size-5 rounded-sm border border-black/5",
                LEVEL_CLASS[lvl],
              )}
            />
          );
        })}
      </div>
      <div className="text-muted-foreground mt-3 flex items-center gap-2 text-[10px] uppercase tracking-wide">
        Moins
        {([0, 1, 2, 3, 4] as const).map((lvl) => (
          <span
            key={lvl}
            className={cn("inline-block size-3 rounded-sm", LEVEL_CLASS[lvl])}
          />
        ))}
        Plus
      </div>
    </div>
  );
}
