import { Badge } from "@/components/ui/badge";
import { formatHHMM, formatLongDate } from "@/lib/week";
import type { ShiftChangeRequestRow } from "@/lib/repositories/shiftChangeRequest";

const STATUS_LABELS: Record<ShiftChangeRequestRow["status"], string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
  CANCELED_BY_EMPLOYEE: "Annulée",
};

const STATUS_TONE: Record<ShiftChangeRequestRow["status"], string> = {
  PENDING: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  APPROVED: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  REJECTED: "border-rose-500/40 text-rose-700 dark:text-rose-400",
  CANCELED_BY_EMPLOYEE: "border-muted-foreground/40 text-muted-foreground",
};

export function DecidedHistoryList({
  requests,
}: {
  requests: ShiftChangeRequestRow[];
}) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
            <th className="px-3 py-2 font-medium">Employé</th>
            <th className="px-3 py-2 font-medium">Shift</th>
            <th className="px-3 py-2 font-medium">Demandé</th>
            <th className="px-3 py-2 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id} className="border-t">
              <td className="px-3 py-2 font-medium">
                {req.employee.name ?? req.employee.email}
              </td>
              <td className="text-muted-foreground px-3 py-2 text-xs">
                {formatLongDate(req.shift.startsAt)}{" "}
                <span className="tabular-nums">
                  {formatHHMM(req.shift.startsAt)}–
                  {formatHHMM(req.shift.endsAt)}
                </span>
              </td>
              <td className="text-muted-foreground px-3 py-2 text-xs tabular-nums">
                {formatHHMM(req.requestedStartsAt)}–
                {formatHHMM(req.requestedEndsAt)}
              </td>
              <td className="px-3 py-2">
                <Badge variant="outline" className={STATUS_TONE[req.status]}>
                  {STATUS_LABELS[req.status]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
