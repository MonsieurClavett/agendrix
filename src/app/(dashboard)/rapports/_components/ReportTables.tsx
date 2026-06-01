import { AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ReportEmployeeRow,
  ReportPositionRow,
} from "@/lib/repositories/reports";

function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(2).replace(".", ",")}h`;
}

function formatSignedHours(minutes: number): string {
  const sign = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  return `${sign}${(Math.abs(minutes) / 60).toFixed(2).replace(".", ",")}h`;
}

export function ReportTables({
  perEmployee,
  perPosition,
}: {
  perEmployee: ReportEmployeeRow[];
  perPosition: ReportPositionRow[];
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Heures par employé</h2>
        <div className="bg-card overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
                <th className="px-3 py-2 font-medium">Employé</th>
                <th className="px-3 py-2 text-right font-medium">Prévu</th>
                <th className="px-3 py-2 text-right font-medium">Travaillé</th>
                <th className="px-3 py-2 text-right font-medium">Écart</th>
              </tr>
            </thead>
            <tbody>
              {perEmployee.map((e) => (
                <tr key={e.employeeId} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {e.name ?? e.email}
                      </span>
                      {e.openSessionsCount > 0 && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 text-amber-700 dark:text-amber-400 gap-1"
                        >
                          <AlertCircle className="size-3" />
                          {e.openSessionsCount} session
                          {e.openSessionsCount > 1 ? "s" : ""} ouverte
                          {e.openSessionsCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    {e.name && (
                      <p className="text-muted-foreground text-xs">{e.email}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatHours(e.scheduledMinutes)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {formatHours(e.workedMinutes)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right tabular-nums font-semibold",
                      e.varianceMinutes > 60 &&
                        "text-emerald-700 dark:text-emerald-400",
                      e.varianceMinutes < -60 &&
                        "text-rose-700 dark:text-rose-400",
                    )}
                  >
                    {formatSignedHours(e.varianceMinutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {perPosition.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Heures par position</h2>
          <div className="bg-card overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
                  <th className="px-3 py-2 font-medium">Position</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Heures prévues
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Heures travaillées (approx.)
                  </th>
                </tr>
              </thead>
              <tbody>
                {perPosition.map((p) => (
                  <tr key={p.positionId ?? "__none__"} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {p.positionName}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatHours(p.scheduledMinutes)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatHours(p.workedMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
