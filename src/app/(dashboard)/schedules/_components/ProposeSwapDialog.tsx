"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  proposeSwapAction,
  type ProposeSwapState,
} from "@/actions/shiftSwaps/propose";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatHHMM, formatLongDate } from "@/lib/week";
import type { WeekShift } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposerShift: WeekShift;
  candidates: WeekShift[];
};

const initial: ProposeSwapState = {};

export function ProposeSwapDialog({
  open,
  onOpenChange,
  proposerShift,
  candidates,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    proposeSwapAction,
    initial,
  );

  const byEmployee = React.useMemo(() => {
    const map = new Map<string, { name: string | null; shifts: WeekShift[] }>();
    for (const c of candidates) {
      if (!c.employeeId) continue;
      const entry = map.get(c.employeeId) ?? {
        name: c.employee?.name ?? null,
        shifts: [],
      };
      entry.shifts.push(c);
      map.set(c.employeeId, entry);
    }
    return map;
  }, [candidates]);

  const employees = React.useMemo(
    () =>
      [...byEmployee.entries()].map(([id, e]) => ({ id, name: e.name })),
    [byEmployee],
  );

  const [selectedTargetUserId, setSelectedTargetUserId] = React.useState(
    employees[0]?.id ?? "",
  );

  useEffect(() => {
    if (employees.length > 0 && !byEmployee.has(selectedTargetUserId)) {
      setSelectedTargetUserId(employees[0].id);
    }
  }, [employees, byEmployee, selectedTargetUserId]);

  const candidateShifts =
    byEmployee.get(selectedTargetUserId)?.shifts ?? [];

  useEffect(() => {
    if (state.success && open) {
      toast.success("Échange proposé.");
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, open, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Proposer un échange</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input
            type="hidden"
            name="proposerShiftId"
            value={proposerShift.id}
          />

          <div className="rounded-md border p-2 text-sm">
            <p className="text-muted-foreground text-xs">Votre shift à céder</p>
            <p className="font-medium">
              {formatLongDate(proposerShift.startsAt)}{" "}
              {formatHHMM(proposerShift.startsAt)}–
              {formatHHMM(proposerShift.endsAt)}
            </p>
          </div>

          {employees.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucun collègue n'a de shift publié à échanger pour le moment.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="swap-target-user">Collègue</Label>
                <select
                  id="swap-target-user"
                  name="targetUserId"
                  required
                  value={selectedTargetUserId}
                  onChange={(e) => setSelectedTargetUserId(e.target.value)}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-[3px] outline-none"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name ?? "(sans nom)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="swap-target-shift">
                  Son shift que vous prendriez
                </Label>
                <select
                  id="swap-target-shift"
                  name="targetShiftId"
                  required
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-[3px] outline-none"
                >
                  {candidateShifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatLongDate(s.startsAt)} {formatHHMM(s.startsAt)}–
                      {formatHHMM(s.endsAt)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="swap-message">Message (optionnel)</Label>
                <Input
                  id="swap-message"
                  name="proposerMessage"
                  maxLength={280}
                  placeholder="Merci pour ton aide !"
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={pending || employees.length === 0}
            >
              {pending ? "Envoi…" : "Envoyer la proposition"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
