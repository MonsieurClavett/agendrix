"use client";

import * as React from "react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createInvitationAction,
  type CreateInvitationState,
} from "@/actions/invitations/create";
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

const initial: CreateInvitationState = {};

export function InviteEmployeeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createInvitationAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success(
        state.success.delivered
          ? `Invitation envoyée à ${state.success.email}.`
          : `Invitation créée. Lien disponible ci-dessous.`,
      );
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, open, router]);

  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Inviter un employé</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un employé</DialogTitle>
          <DialogDescription>
            Un email contenant un lien d&apos;activation sera envoyé. Le lien
            est valable 7 jours.
          </DialogDescription>
        </DialogHeader>

        {state.success ? (
          <InvitationLinkCard
            email={state.success.email}
            link={state.success.link}
            delivered={state.success.delivered}
            onClose={close}
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
                {pending ? "Envoi…" : "Envoyer l'invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvitationLinkCard({
  email,
  link,
  delivered,
  onClose,
}: {
  email: string;
  link: string;
  delivered: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-emerald-500/50 bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
        <p className="font-medium">
          {delivered
            ? `Email envoyé à ${email}`
            : `Lien d'invitation (mode dev — aucun email envoyé)`}
        </p>
        <p className="mt-1 text-xs">
          Vous pouvez aussi le partager manuellement&nbsp;:
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="bg-background flex-1 rounded border px-2 py-1.5 font-mono text-[11px] break-all">
            {link}
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
