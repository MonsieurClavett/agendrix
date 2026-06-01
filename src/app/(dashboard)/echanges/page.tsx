import { requireTenantContext } from "@/lib/session";
import { listSwapsForUser } from "@/lib/repositories/shiftSwap";
import { IncomingSwapsList } from "./_components/IncomingSwapsList";
import { ManagerSwapsList } from "./_components/ManagerSwapsList";
import { MySwapsList } from "./_components/MySwapsList";

export default async function EchangesPage() {
  const ctx = await requireTenantContext();
  const { proposed, incoming, managerPending } = await listSwapsForUser(ctx);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Échanges</h1>
        <p className="text-muted-foreground text-sm">
          Proposez et gérez les échanges de shifts entre collègues.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          En attente de ma décision
        </h2>
        <IncomingSwapsList swaps={incoming} />
      </section>

      {ctx.role === "MANAGER" && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            À approuver
          </h2>
          <ManagerSwapsList swaps={managerPending} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Mes propositions
        </h2>
        <MySwapsList swaps={proposed} />
      </section>
    </div>
  );
}
