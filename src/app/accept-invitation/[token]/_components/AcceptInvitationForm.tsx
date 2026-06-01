"use client";

import * as React from "react";
import { useActionState } from "react";

import {
  acceptInvitationAction,
  type AcceptInvitationState,
} from "@/actions/invitations/accept";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  token: string;
  email: string;
  defaultName: string;
};

const initial: AcceptInvitationState = {};

export function AcceptInvitationForm({ token, email, defaultName }: Props) {
  const [state, formAction, pending] = useActionState(
    acceptInvitationAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <Label htmlFor="accept-email">Email</Label>
        <Input id="accept-email" value={email} disabled readOnly />
      </div>

      <div className="space-y-2">
        <Label htmlFor="accept-name">Nom complet</Label>
        <Input
          id="accept-name"
          name="name"
          required
          defaultValue={defaultName}
          maxLength={80}
        />
        {state.fieldErrors?.name && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.name[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="accept-password">Mot de passe</Label>
        <Input
          id="accept-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {state.fieldErrors?.password && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="accept-confirm">Confirmer le mot de passe</Label>
        <Input
          id="accept-confirm"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.confirmPassword[0]}
          </p>
        )}
      </div>

      {state.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Activation…" : "Activer mon compte"}
      </Button>
    </form>
  );
}
