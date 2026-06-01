function formatHours(min: number): string {
  return `${(min / 60).toFixed(1).replace(".", ",")}h`;
}

type Row = { label: string; value: number };

export function DistributionBars({ rows }: { rows: Row[] }) {
  const max = rows.reduce((acc, r) => Math.max(acc, r.value), 0);
  return (
    <div className="bg-card space-y-2 rounded-xl border p-4">
      {rows.map((r) => {
        const pct = max > 0 ? Math.round((r.value / max) * 100) : 0;
        return (
          <div key={r.label} className="flex items-center gap-3">
            <div className="text-muted-foreground w-12 shrink-0 text-xs font-medium uppercase tracking-wide">
              {r.label}
            </div>
            <div className="bg-muted/40 relative h-5 flex-1 overflow-hidden rounded-md">
              <div
                className="bg-primary h-full rounded-md transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">
              {formatHours(r.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
