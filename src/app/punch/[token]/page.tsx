import Link from "next/link";
import { redirect } from "next/navigation";
import { ScanLine, AlertTriangle } from "lucide-react";

import { auth } from "@/auth";
import { requireTenantContext } from "@/lib/session";
import { getLocationByToken } from "@/lib/repositories/punchLocation";
import { getLastPunchOfDay } from "@/lib/repositories/punch";
import { Button } from "@/components/ui/button";
import { PunchButton } from "./_components/PunchButton";

type Props = {
  params: Promise<{ token: string }>;
};

function formatHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function PunchPage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/punch/${token}`)}`);
  }

  const location = await getLocationByToken(token);

  if (!location) {
    return (
      <ErrorShell
        title="Poste introuvable"
        body="Le QR code que vous avez scanné n'est associé à aucun poste de pointage."
      />
    );
  }

  const ctx = await requireTenantContext();

  if (location.companyId !== ctx.companyId) {
    return (
      <ErrorShell
        title="Mauvaise entreprise"
        body="Ce poste de pointage appartient à une autre entreprise que la vôtre."
      />
    );
  }

  if (!location.isActive) {
    return (
      <ErrorShell
        title="Poste désactivé"
        body={`Le poste « ${location.name} » est actuellement désactivé. Contactez votre gestionnaire.`}
      />
    );
  }

  const today = new Date();
  const lastPunch = await getLastPunchOfDay(ctx, ctx.userId, today);
  const nextType: "IN" | "OUT" =
    lastPunch === null || lastPunch.type === "OUT" ? "IN" : "OUT";

  return (
    <main className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-cyan-100/40 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950/30">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
        <header className="mb-8 flex items-center gap-3">
          <span className="bg-primary text-primary-foreground inline-flex size-9 items-center justify-center rounded-lg text-base font-bold shadow-sm">
            A
          </span>
          <div className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {location.companyName}
            </p>
            <p className="text-sm font-semibold">Pointage</p>
          </div>
        </header>

        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          <div className="bg-primary/10 text-primary mb-5 inline-flex size-12 items-center justify-center rounded-xl">
            <ScanLine className="size-6" />
          </div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Poste
          </p>
          <h1 className="text-foreground text-2xl font-semibold leading-tight">
            {location.name}
          </h1>

          <div className="my-6 h-px bg-border" />

          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {session.user.name ?? session.user.email}
          </p>
          {lastPunch ? (
            <p className="mt-1 text-sm">
              Dernier pointage à <strong>{formatHHMM(lastPunch.punchedAt)}</strong>{" "}
              ({lastPunch.type === "IN" ? "entrée" : "sortie"})
            </p>
          ) : (
            <p className="mt-1 text-sm">Aucun pointage aujourd&apos;hui.</p>
          )}

          <div className="mt-6">
            <PunchButton token={token} nextType={nextType} />
          </div>
        </div>

        <footer className="mt-auto pt-8 text-center">
          <Link
            href="/me/pointage"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Voir mon historique →
          </Link>
        </footer>
      </div>
    </main>
  );
}

function ErrorShell({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-5 py-10">
      <div className="bg-card max-w-sm rounded-2xl border p-6 text-center shadow-sm">
        <div className="bg-destructive/10 text-destructive mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-xl">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{body}</p>
        <Button asChild className="mt-5">
          <Link href="/dashboard">Retour au tableau de bord</Link>
        </Button>
      </div>
    </main>
  );
}
