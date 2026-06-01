import { History } from "lucide-react";

import { requireTenantContext } from "@/lib/session";
import { listPunchesForUser, pairPunches } from "@/lib/repositories/punch";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { MyPunchesList } from "./_components/MyPunchesList";

export default async function MyPointagePage() {
  const ctx = await requireTenantContext();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  since.setHours(0, 0, 0, 0);

  const punches = await listPunchesForUser(ctx, ctx.userId, since);
  const sessions = pairPunches(punches);

  // Aggregate worked minutes (closed sessions only).
  const totalMinutes = sessions.reduce(
    (acc, s) => acc + (s.durationMinutes ?? 0),
    0,
  );
  const totalHours = Math.round(totalMinutes / 60);

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        eyebrow="Vous"
        title="Mes pointages"
        description="Historique de vos 30 derniers jours. Les sessions ouvertes (sans pointage de sortie) sont marquées « En cours »."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Sessions
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {sessions.length}
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Heures travaillées
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {totalHours}h
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Sessions ouvertes
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {sessions.filter((s) => s.endsAt === null).length}
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<History className="size-5" />}
          title="Aucun pointage récent"
          description="Vous n'avez pas pointé dans les 30 derniers jours. Scannez le QR code de votre poste de pointage pour commencer."
        />
      ) : (
        <MyPunchesList
          sessions={sessions.map((s) => ({
            startsAt: s.startsAt,
            endsAt: s.endsAt,
            durationMinutes: s.durationMinutes,
            locationName: s.location?.name ?? "Poste supprimé",
          }))}
        />
      )}
    </div>
  );
}
