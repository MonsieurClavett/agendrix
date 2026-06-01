import { Edit } from "lucide-react";

import { requireTenantContext } from "@/lib/session";
import {
  listPendingForCompany,
  listRecentDecidedForCompany,
  listMyRequests,
} from "@/lib/repositories/shiftChangeRequest";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PendingRequestsList } from "./_components/PendingRequestsList";
import { DecidedHistoryList } from "./_components/DecidedHistoryList";
import { MyRequestsList } from "./_components/MyRequestsList";

export default async function ModificationsPage() {
  const ctx = await requireTenantContext();
  const isManager = ctx.role === "MANAGER";

  const [pending, decided, mine] = await Promise.all([
    isManager ? listPendingForCompany(ctx) : Promise.resolve([]),
    isManager ? listRecentDecidedForCompany(ctx) : Promise.resolve([]),
    listMyRequests(ctx),
  ]);

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="Workflow"
        title="Demandes de modification"
        description="Demandes de changement d'horaire sur les shifts publiés. Les MANAGERs approuvent ou refusent ; les employés peuvent annuler leur demande en cours."
      />

      {isManager && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">À traiter</h2>
            <span
              className={
                pending.length > 0
                  ? "bg-primary/15 text-primary inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums"
                  : "bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums"
              }
            >
              {pending.length}
            </span>
          </div>
          {pending.length === 0 ? (
            <EmptyState
              icon={<Edit className="size-5" />}
              title="Aucune demande en attente"
              description="Les nouvelles demandes des employés apparaîtront ici."
            />
          ) : (
            <PendingRequestsList requests={pending} />
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          {isManager ? "Mes demandes" : "Mes demandes en cours et historique"}
        </h2>
        {mine.length === 0 ? (
          <EmptyState
            icon={<Edit className="size-5" />}
            title="Aucune demande de votre part"
            description={
              isManager
                ? "Vous n'avez pas demandé de changement sur vos propres shifts."
                : "Sur un shift publié, ouvrez-le et cliquez « Demander un changement d'horaire »."
            }
          />
        ) : (
          <MyRequestsList requests={mine} />
        )}
      </section>

      {isManager && decided.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Décisions récentes</h2>
          <DecidedHistoryList requests={decided} />
        </section>
      )}
    </div>
  );
}
