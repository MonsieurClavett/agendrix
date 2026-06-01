import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { findInvitationByTokenHash } from "@/lib/repositories/invitation";
import { hashInvitationToken } from "@/lib/tokens";
import { AcceptInvitationForm } from "./_components/AcceptInvitationForm";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function AcceptInvitationPage({ params }: Props) {
  const { token } = await params;
  const tokenHash = hashInvitationToken(token);
  const invitation = await findInvitationByTokenHash(tokenHash);

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {!invitation ? (
          <StateCard
            title="Invitation introuvable"
            body="Le lien d'invitation est invalide ou a été révoqué."
            action={{ href: "/login", label: "Se connecter" }}
          />
        ) : invitation.status === "ACCEPTED" ? (
          <StateCard
            title="Invitation déjà utilisée"
            body="Cette invitation a déjà servi à créer un compte. Connectez-vous avec votre compte existant."
            action={{ href: "/login", label: "Se connecter" }}
          />
        ) : invitation.expiresAt.getTime() < Date.now() ? (
          <StateCard
            title="Invitation expirée"
            body="Demandez à votre gestionnaire d'en envoyer une nouvelle."
            action={{ href: "/login", label: "Se connecter" }}
          />
        ) : (
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold">
                  Bienvenue {invitation.name}&nbsp;!
                </h1>
                <p className="text-muted-foreground text-sm">
                  Choisissez un mot de passe pour activer votre compte
                  Agendrix.
                </p>
              </div>
              <AcceptInvitationForm
                token={token}
                email={invitation.email}
                defaultName={invitation.name}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function StateCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { href: string; label: string };
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">{body}</p>
        <Button asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
