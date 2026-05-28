"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateEmployeeAction, type UpdateState } from "@/actions/team/update";
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
import type { Role } from "@/generated/prisma";

const initial: UpdateState = {};

type Props = {
  user: { id: string; name: string | null; role: Role };
};

export function EditEmployeeDialog({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateEmployeeAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, open, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;employé</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${user.id}`}>Nom</Label>
            <Input
              id={`edit-name-${user.id}`}
              name="name"
              required
              defaultValue={user.name ?? ""}
            />
            {state.fieldErrors?.name && (
              <p className="text-destructive text-xs">
                {state.fieldErrors.name[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-role-${user.id}`}>Rôle</Label>
            <select
              id={`edit-role-${user.id}`}
              name="role"
              required
              defaultValue={user.role}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-[3px] outline-none"
            >
              <option value="EMPLOYEE">Employé</option>
              <option value="MANAGER">Gestionnaire</option>
            </select>
          </div>

          {state.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
