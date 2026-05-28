"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { inviteEmployeeAction, type InviteState } from "@/actions/team/invite";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: InviteState = {};

export function InviteEmployeeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    inviteEmployeeAction,
    initial,
  );

  const reset = () => {
    setOpen(false);
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>Inviter un employé</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un employé</DialogTitle>
          <DialogDescription>
            Le mot de passe temporaire ne sera affiché qu&apos;une seule fois.
          </DialogDescription>
        </DialogHeader>

        {state.success ? (
          <TempPasswordCard
            email={state.success.email}
            tempPassword={state.success.tempPassword}
            onClose={reset}
          />
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                required
                autoFocus
              />
              {state.fieldErrors?.email && (
                <p className="text-destructive text-xs">
                  {state.fieldErrors.email[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nom</Label>
              <Input id="invite-name" name="name" required />
              {state.fieldErrors?.name && (
                <p className="text-destructive text-xs">
                  {state.fieldErrors.name[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Rôle</Label>
              <select
                id="invite-role"
                name="role"
                required
                defaultValue="EMPLOYEE"
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
                {pending ? "Création…" : "Créer le compte"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TempPasswordCard({
  email,
  tempPassword,
  onClose,
}: {
  email: string;
  tempPassword: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-500/50 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">Mot de passe temporaire</p>
        <p className="mt-1 text-xs">
          Communiquez-le à {email}. Il ne sera plus affiché après la fermeture
          de cette fenêtre.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="bg-background flex-1 rounded border px-2 py-1.5 font-mono text-sm">
            {tempPassword}
          </code>
          <Button type="button" size="sm" variant="outline" onClick={copy}>
            {copied ? "Copié ✓" : "Copier"}
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Fermer
        </Button>
      </DialogFooter>
    </div>
  );
}
