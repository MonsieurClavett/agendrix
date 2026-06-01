"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createShiftAction, type CreateState } from "@/actions/shifts/create";
import { updateShiftAction, type UpdateState } from "@/actions/shifts/update";
import {
  unpublishShiftAction,
  type UnpublishShiftState,
} from "@/actions/shifts/unpublish";
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
import { toISODate, formatHHMM, formatLongDate } from "@/lib/week";
import { getPositionColor } from "@/lib/positions";
import type { ClaimRow } from "@/lib/repositories/shiftClaim";
import { AssignClaimDialog } from "./AssignClaimDialog";
import { ProposeSwapDialog } from "./ProposeSwapDialog";
import { ChangeRequestDialog } from "./ChangeRequestDialog";
import type { Employee, PositionOption, WeekShift } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  positions: PositionOption[];
  defaultDate: string;
  defaultPositionId?: string | null;
  shift?: WeekShift | null;
  onDeleteRequest?: (shift: WeekShift) => void;
  claims?: ClaimRow[];
  currentUserId: string;
  allShifts?: WeekShift[];
  hasPendingChangeRequest?: boolean;
};

const initialCreate: CreateState = {};
const initialUpdate: UpdateState = {};
const initialUnpublish: UnpublishShiftState = {};

export function ShiftDialog({
  open,
  onOpenChange,
  employees,
  positions,
  defaultDate,
  defaultPositionId,
  shift,
  onDeleteRequest,
  claims = [],
  currentUserId,
  allShifts = [],
  hasPendingChangeRequest = false,
}: Props) {
  const [assignTarget, setAssignTarget] = React.useState<ClaimRow | null>(
    null,
  );
  const [proposeOpen, setProposeOpen] = React.useState(false);
  const [changeRequestOpen, setChangeRequestOpen] = React.useState(false);
  const router = useRouter();

  const [createState, createForm, createPending] = useActionState(
    createShiftAction,
    initialCreate,
  );
  const [updateState, updateForm, updatePending] = useActionState(
    updateShiftAction,
    initialUpdate,
  );
  const [unpublishState, unpublishForm, unpublishPending] = useActionState(
    unpublishShiftAction,
    initialUnpublish,
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

  useEffect(() => {
    if (unpublishState.success && open) {
      toast.success("Shift dépublié.");
      onOpenChange(false);
      router.refresh();
    } else if (unpublishState.error) {
      toast.error(unpublishState.error);
    }
  }, [
    unpublishState.success,
    unpublishState.error,
    open,
    onOpenChange,
    router,
  ]);

  const pickerEmployees: Employee[] =
    shift && shift.employeeId && !employees.some((e) => e.id === shift.employeeId)
      ? [
          ...employees,
          {
            id: shift.employeeId,
            name: shift.employee?.name ?? "(sans nom)",
          },
        ]
      : employees;

  const initialDate = shift ? toISODate(shift.startsAt) : defaultDate;
  const initialStart = shift ? formatHHMM(shift.startsAt) : "09:00";
  const initialEnd = shift ? formatHHMM(shift.endsAt) : "17:00";
  const initialPositionId =
    shift?.positionId ?? defaultPositionId ?? "";

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
              defaultValue={shift?.employeeId ?? ""}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-[3px] outline-none"
            >
              <option value="">Quart à combler (aucun employé)</option>
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

          <div className="space-y-2">
            <Label htmlFor="shift-position">Position</Label>
            <PositionSelect
              positions={positions}
              defaultValue={initialPositionId}
            />
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
            <Label htmlFor="shift-note">
              Note <span className="text-muted-foreground text-xs">(visible par l&apos;employé)</span>
            </Label>
            <Input
              id="shift-note"
              name="note"
              maxLength={280}
              defaultValue={shift?.note ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift-internal-note">
              Note interne{" "}
              <span className="text-muted-foreground text-xs">
                (gestionnaires seulement)
              </span>
            </Label>
            <textarea
              id="shift-internal-note"
              name="internalNote"
              maxLength={500}
              rows={2}
              defaultValue={shift?.internalNote ?? ""}
              placeholder="Visible uniquement par les gestionnaires"
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
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

        {shift && shift.status === "PUBLISHED" && (
          <form action={unpublishForm} className="border-t pt-3">
            <input type="hidden" name="shiftId" value={shift.id} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={unpublishPending}
              className="w-full"
            >
              {unpublishPending
                ? "Dépublication…"
                : "Dépublier ce shift (le ramener en brouillon)"}
            </Button>
          </form>
        )}

        {shift &&
          shift.status === "PUBLISHED" &&
          shift.employeeId === currentUserId && (
            <div className="space-y-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setProposeOpen(true)}
              >
                Proposer un échange
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setChangeRequestOpen(true)}
                disabled={hasPendingChangeRequest}
              >
                {hasPendingChangeRequest
                  ? "Demande de changement en cours…"
                  : "Demander un changement d'horaire"}
              </Button>
            </div>
          )}

        {changeRequestOpen && shift && (
          <ChangeRequestDialog
            open={true}
            onOpenChange={(o) => {
              if (!o) setChangeRequestOpen(false);
            }}
            shift={shift}
          />
        )}

        {proposeOpen && shift && (
          <ProposeSwapDialog
            open={true}
            onOpenChange={(o) => {
              if (!o) setProposeOpen(false);
            }}
            proposerShift={shift}
            candidates={allShifts.filter(
              (s) =>
                s.status === "PUBLISHED" &&
                s.employeeId !== null &&
                s.employeeId !== currentUserId &&
                s.id !== shift.id,
            )}
          />
        )}

        {shift && shift.employeeId === null && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-semibold">Demandes</p>
            {claims.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                Aucune demande pour le moment.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {claims.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="truncate">
                      {c.employee.name ?? "(sans nom)"}
                      <span className="text-muted-foreground ml-2 text-xs">
                        {c.status === "PENDING"
                          ? "en attente"
                          : c.status === "APPROVED"
                            ? "approuvée"
                            : "refusée"}
                      </span>
                    </span>
                    {c.status === "PENDING" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setAssignTarget(c)}
                      >
                        Attribuer
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {assignTarget && shift && (
          <AssignClaimDialog
            open={true}
            onOpenChange={(o) => {
              if (!o) setAssignTarget(null);
            }}
            shiftId={shift.id}
            claimId={assignTarget.id}
            assigneeName={assignTarget.employee.name ?? "(sans nom)"}
            shiftSummary={`${formatLongDate(shift.startsAt)} ${formatHHMM(shift.startsAt)}–${formatHHMM(shift.endsAt)}`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PositionSelect({
  positions,
  defaultValue,
}: {
  positions: PositionOption[];
  defaultValue: string;
}) {
  const [value, setValue] = React.useState(defaultValue);
  const selected = positions.find((p) => p.id === value);
  const palette = selected ? getPositionColor(selected.color) : null;
  return (
    <div className="flex items-center gap-2">
      <span
        className="border-border size-5 shrink-0 rounded-full border"
        style={{
          backgroundColor: palette ? palette.swatch : "transparent",
        }}
        aria-hidden="true"
      />
      <select
        id="shift-position"
        name="positionId"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-[3px] outline-none"
      >
        <option value="">Aucune</option>
        {positions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
