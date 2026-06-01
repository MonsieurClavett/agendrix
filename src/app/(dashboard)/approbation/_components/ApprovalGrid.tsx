"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { decideTimesheetAction } from "@/actions/timesheets/decide";
import type { TimesheetEntry } from "@/lib/repositories/timesheetApproval";

type Props = {
  entries: TimesheetEntry[];
  weekStartISO: string;
};

const STATUS_LABELS: Record<TimesheetEntry["status"], string> = {
  UNREVIEWED: "Non revu",
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "À revoir",
};

const STATUS_TONE: Record<TimesheetEntry["status"], string> = {
  UNREVIEWED: "border-muted-foreground/30 text-muted-foreground",
  PENDING: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  APPROVED: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  REJECTED: "border-rose-500/40 text-rose-700 dark:text-rose-400",
};

function formatHours(min: number): string {
  return `${(min / 60).toFixed(2).replace(".", ",")}h`;
}

function formatSignedHours(min: number): string {
  const sign = min > 0 ? "+" : min < 0 ? "-" : "";
  return `${sign}${(Math.abs(min) / 60).toFixed(2).replace(".", ",")}h`;
}

export function ApprovalGrid({ entries, weekStartISO }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const decide = (
    employeeId: string,
    status: "APPROVED" | "REJECTED",
    managerNote?: string,
  ) => {
    setActiveId(employeeId);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("weekStart", weekStartISO);
      fd.append("employeeId", employeeId);
      fd.append("status", status);
      if (managerNote) fd.append("managerNote", managerNote);
      const r = await decideTimesheetAction({}, fd);
      setActiveId(null);
      if (r.success) {
        toast.success(
          status === "APPROVED" ? "Heures approuvées." : "Heures marquées à revoir.",
        );
        router.refresh();
      } else if (r.error) {
        toast.error(r.error);
      }
    });
  };

  const bulkApprove = () => {
    if (
      !confirm(
        `Approuver les heures de tous les employés non encore revus (${entries.filter((e) => e.status === "UNREVIEWED" || e.status === "PENDING").length}) ?`,
      )
    )
      return;
    startTransition(async () => {
      for (const e of entries) {
        if (e.status === "UNREVIEWED" || e.status === "PENDING") {
          const fd = new FormData();
          fd.append("weekStart", weekStartISO);
          fd.append("employeeId", e.employeeId);
          fd.append("status", "APPROVED");
          await decideTimesheetAction({}, fd);
        }
      }
      toast.success("Approbations groupées effectuées.");
      router.refresh();
    });
  };

  const pendingCount = entries.filter(
    (e) => e.status === "UNREVIEWED" || e.status === "PENDING",
  ).length;

  return (
    <div className="space-y-3">
      {pendingCount > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={bulkApprove}
            disabled={pending}
          >
            <Check />
            Tout approuver ({pendingCount})
          </Button>
        </div>
      )}

      <div className="bg-card overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
              <th className="px-3 py-2 font-medium">Employé</th>
              <th className="px-3 py-2 text-right font-medium">Prévu</th>
              <th className="px-3 py-2 text-right font-medium">Travaillé</th>
              <th className="px-3 py-2 text-right font-medium">Écart</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const busy = pending && activeId === e.employeeId;
              return (
                <tr key={e.employeeId} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={e.employeeName ?? e.employeeEmail}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {e.employeeName ?? e.employeeEmail}
                        </p>
                        {e.managerNote && (
                          <p className="text-muted-foreground truncate text-[11px]">
                            « {e.managerNote} »
                          </p>
                        )}
                      </div>
                    </div>
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
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={STATUS_TONE[e.status]}>
                      {STATUS_LABELS[e.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => decide(e.employeeId, "REJECTED")}
                        disabled={busy}
                        aria-label="Marquer à revoir"
                      >
                        <X />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => decide(e.employeeId, "APPROVED")}
                        disabled={busy}
                      >
                        <Check />
                        Approuver
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
