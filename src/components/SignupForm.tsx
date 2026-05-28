"use client";

import { useActionState } from "react";
import { signupAction, type SignupState } from "@/actions/signup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: SignupState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
        <Input id="companyName" name="companyName" required />
        {state.fieldErrors?.companyName && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.companyName[0]}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Votre nom</Label>
        <Input id="name" name="name" required />
        {state.fieldErrors?.name && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.name[0]}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
        {state.fieldErrors?.email && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
        />
        {state.fieldErrors?.password && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      {state.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
