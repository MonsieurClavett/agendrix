"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createShiftAction, type CreateState } from "@/actions/shifts/create";
import { updateShiftAction, type UpdateState } from "@/actions/shifts/update";
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
import { toISODate, formatHHMM } from "@/lib/week";
import type { Employee, WeekShift } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  defaultDate: string;
  shift?: WeekShift | null;
  onDeleteRequest?: (shift: WeekShift) => void;
};

const initialCreate: CreateState = {};
const initialUpdate: UpdateState = {};

export function ShiftDialog({
  open,
  onOpenChange,
  employees,
  defaultDate,
  shift,
  onDeleteRequest,
}: Props) {
  const router = useRouter();

  const [createState, createForm, createPending] = useActionState(
    createShiftAction,
    initialCreate,
  );
  const [updateState, updateForm, updatePending] = useActionState(
    updateShiftAction,
    initialUpdate,
  );

  const state = shift ? updateState : createState;
  const formAction = shift ? updateForm : createForm;
  const pending = shift ? updatePending : createPending;

  useEffect(() => {
    if (state.success && open) {
      toast.success(shift ? "Shift mis à jour." : "Shift créé.");
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, open, onOpenChange, router, shift]);

  // Build picker list — for edit, include the current assignee even if
  // they're deactivated (they wouldn't be in the active picker list).
  const pickerEmployees: Employee[] =
    shift && !employees.some((e) => e.id === shift.employeeId)
      ? [...employees, { id: shift.employeeId, name: shift.employee.name }]
      : employees;

  const initialDate = shift ? toISODate(shift.startsAt) : defaultDate;
  const initialStart = shift ? formatHHMM(shift.startsAt) : "09:00";
  const initialEnd = shift ? formatHHMM(shift.endsAt) : "17:00";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {shift ? "Modifier le shift" : "Nouveau shift"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {shift && <input type="hidden" name="shiftId" value={shift.id} />}

          <div className="space-y-2">
            <Label htmlFor="shift-employee">Employé</Label>
            <select
              id="shift-employee"
              name="employeeId"
              required
              defaultValue={shift?.employeeId ?? ""}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-[3px] outline-none"
            >
              <option value="" disabled>
                — Sélectionner —
              </option>
              {pickerEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name ?? "(sans nom)"}
                </option>
              ))}
            </select>
            {state.fieldErrors?.employeeId && (
              <p className="text-destructive text-xs">
                {state.fieldErrors.employeeId[0]}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-3 sm:col-span-1">
              <Label htmlFor="shift-date">Date</Label>
              <Input
                id="shift-date"
                name="date"
                type="date"
                required
                defaultValue={initialDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-start">Début</Label>
              <Input
                id="shift-start"
                name="start"
                type="time"
                required
                defaultValue={initialStart}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-end">Fin</Label>
              <Input
                id="shift-end"
                name="end"
                type="time"
                required
                defaultValue={initialEnd}
              />
              {state.fieldErrors?.end && (
                <p className="text-destructive text-xs">
                  {state.fieldErrors.end[0]}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift-note">Note (optionnelle)</Label>
            <Input
              id="shift-note"
              name="note"
              maxLength={280}
              defaultValue={shift?.note ?? ""}
            />
          </div>

          <DialogFooter className="sm:justify-between">
            {shift && onDeleteRequest ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onOpenChange(false);
                  onDeleteRequest(shift);
                }}
              >
                Supprimer
              </Button>
            ) : (
              <div />
            )}
            <Button type="submit" disabled={pending}>
              {pending
                ? "Enregistrement…"
                : shift
                  ? "Enregistrer"
                  : "Créer le shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
