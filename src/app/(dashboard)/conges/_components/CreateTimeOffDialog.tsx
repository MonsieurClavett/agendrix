"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createTimeOffAction,
  type CreateTimeOffState,
} from "@/actions/timeOff/create";
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
import { TIME_OFF_TYPE_LABELS } from "@/lib/timeOff";

type EmployeeOption = { id: string; name: string | null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetEmployeeId: string;
  employees?: EmployeeOption[];
};

const initial: CreateTimeOffState = {};

export function CreateTimeOffDialog({
  open,
  onOpenChange,
  targetEmployeeId,
  employees,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createTimeOffAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Demande envoyée.");
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
          <DialogTitle>Nouvelle demande de congé</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {employees ? (
            <div className="space-y-2">
              <Label htmlFor="timeoff-employee">Employé</Label>
              <select
                id="timeoff-employee"
                name="targetEmployeeId"
                required
                defaultValue={targetEmployeeId}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-[3px] outline-none"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name ?? "(sans nom)"}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input
              type="hidden"
              name="targetEmployeeId"
              value={targetEmployeeId}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="timeoff-start">Du</Label>
              <Input
                id="timeoff-start"
                name="startDate"
                type="date"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeoff-end">Au</Label>
              <Input id="timeoff-end" name="endDate" type="date" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeoff-type">Type</Label>
            <select
              id="timeoff-type"
              name="type"
              required
              defaultValue="PAID"
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-[3px] outline-none"
            >
              {(["PAID", "UNPAID", "SICK"] as const).map((t) => (
                <option key={t} value={t}>
                  {TIME_OFF_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeoff-reason">Raison (optionnelle)</Label>
            <Input id="timeoff-reason" name="reason" maxLength={280} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Envoi…" : "Envoyer la demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
