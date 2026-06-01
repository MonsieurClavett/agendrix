"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  resendInvitationAction,
  type ResendInvitationState,
} from "@/actions/invitations/resend";
import {
  revokeInvitationAction,
  type RevokeInvitationState,
} from "@/actions/invitations/revoke";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatLongDate } from "@/lib/week";
import type { InvitationRow } from "@/lib/repositories/invitation";

type Props = {
  invitations: InvitationRow[];
};

export function PendingInvitationsList({ invitations }: Props) {
  if (invitations.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide">
        Invitations en attente
      </h2>
      <div className="space-y-2">
        {invitations.map((inv) => (
          <InvitationRowCard key={inv.id} invitation={inv} />
        ))}
      </div>
    </div>
  );
}

function InvitationRowCard({ invitation }: { invitation: InvitationRow }) {
  const isExpired =
    invitation.status === "PENDING" &&
    invitation.expiresAt.getTime() < Date.now();
  const isAccepted = invitation.status === "ACCEPTED";

  if (isAccepted) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{invitation.email}</span>
            <Badge variant="outline">
              {invitation.role === "MANAGER" ? "Gestionnaire" : "Employé"}
            </Badge>
            {isExpired ? (
              <Badge variant="destructive">Expirée</Badge>
            ) : (
              <Badge variant="secondary">En attente</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {invitation.name} · expire le {formatLongDate(invitation.expiresAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ResendButton invitationId={invitation.id} disabled={isExpired} />
          <RevokeButton invitationId={invitation.id} />
        </div>
      </CardContent>
    </Card>
  );
}

const initialResend: ResendInvitationState = {};
function ResendButton({
  invitationId,
  disabled,
}: {
  invitationId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    resendInvitationAction,
    initialResend,
  );

  useEffect(() => {
    if (state.success) {
      toast.success(
        state.success.delivered
          ? "Email renvoyé."
          : "Lien régénéré (mode dev).",
      );
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={disabled || pending}
      >
        {pending ? "…" : "Renvoyer"}
      </Button>
    </form>
  );
}

const initialRevoke: RevokeInvitationState = {};
function RevokeButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    revokeInvitationAction,
    initialRevoke,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Invitation supprimée.");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        disabled={pending}
      >
        {pending ? "…" : "Révoquer"}
      </Button>
    </form>
  );
}
