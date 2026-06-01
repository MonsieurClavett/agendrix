"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TimeOffRequestRow as TimeOffRow } from "@/lib/repositories/timeOff";
import { CreateTimeOffDialog } from "./CreateTimeOffDialog";
import { ManagerHistoryList } from "./ManagerHistoryList";
import { ManagerPendingList } from "./ManagerPendingList";

type EmployeeOption = { id: string; name: string | null };

type Props = {
  pending: TimeOffRow[];
  decided: TimeOffRow[];
  employees: EmployeeOption[];
  currentUserId: string;
};

type Tab = "pending" | "history";

export function TimeOffPageClient({
  pending,
  decided,
  employees,
  currentUserId,
}: Props) {
  const [tab, setTab] = React.useState<Tab>("pending");
  const [createOpen, setCreateOpen] = React.useState(false);

  const defaultEmployeeId =
    employees.find((e) => e.id === currentUserId)?.id ??
    employees[0]?.id ??
    currentUserId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="bg-muted/30 inline-flex gap-1 rounded-md border p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={cn(
              "rounded-sm px-3 py-1 font-medium transition-colors",
              tab === "pending"
                ? "bg-background shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            À approuver
            {pending.length > 0 && (
              <span className="text-muted-foreground ml-1.5 text-xs">
                ({pending.length})
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={cn(
              "rounded-sm px-3 py-1 font-medium transition-colors",
              tab === "history"
                ? "bg-background shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Historique
          </button>
        </div>

        <Button type="button" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          Nouvelle demande
        </Button>
      </div>

      {tab === "pending" ? (
        <ManagerPendingList requests={pending} />
      ) : (
        <ManagerHistoryList requests={decided} />
      )}

      {createOpen && (
        <CreateTimeOffDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setCreateOpen(false);
          }}
          targetEmployeeId={defaultEmployeeId}
          employees={employees}
        />
      )}
    </div>
  );
}
