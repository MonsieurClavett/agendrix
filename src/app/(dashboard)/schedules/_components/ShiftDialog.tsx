"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createShiftAction, type CreateState } from "@/actions/shifts/create";
import { updateShiftAction, type UpdateState } from "@/actions/shifts/update";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toISODate, formatHHMM } from "@/lib/week";

type Employee = { id: string; name: string | null };

type ShiftForEdit = {
  id: string;
  employeeId: string;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
};

type Props = {
  employees: Employee[];
  defaultDate: string;
  trigger?: React.ReactNode;
  shift?: ShiftForEdit;
};

const initialCreate: CreateState = {};
const initialUpdate: UpdateState = {};

export function ShiftDialog({ employees, defaultDate, trigger, shift }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

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
      setOpen(false);
      router.refresh();
    }
  }, [state.success, open, router]);

  const initialDate = shift ? toISODate(shift.startsAt) : defaultDate;
  const initialStart = shift ? formatHHMM(shift.startsAt) : "09:00";
  const initialEnd = shift ? formatHHMM(shift.endsAt) : "17:00";

  const defaultTrigger = shift ? (
    <Button size="sm" variant="outline">Modifier</Button>
  ) : (
    <Button>Ajouter un shift</Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
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
              {employees.map((e) => (
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

          {state.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <DialogFooter>
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
