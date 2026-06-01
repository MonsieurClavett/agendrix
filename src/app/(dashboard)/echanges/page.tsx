import { requireTenantContext } from "@/lib/session";
import { listSwapsForUser } from "@/lib/repositories/shiftSwap";
import { PageHeader } from "@/components/ui/page-header";
import { IncomingSwapsList } from "./_components/IncomingSwapsList";
import { ManagerSwapsList } from "./_components/ManagerSwapsList";
import { MySwapsList } from "./_components/MySwapsList";

export default async function EchangesPage() {
  const ctx = await requireTenantContext();
  const { proposed, incoming, managerPending } = await listSwapsForUser(ctx);

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="Collaboration"
        title="Échanges de shifts"
        description="Proposez et gérez les échanges de shifts entre collègues."
      />

      <Section
        title="En attente de ma décision"
        count={incoming.length}
        accent={incoming.length > 0 ? "primary" : "muted"}
      >
        <IncomingSwapsList swaps={incoming} />
      </Section>

      {ctx.role === "MANAGER" && (
        <Section
          title="À approuver"
          count={managerPending.length}
          accent={managerPending.length > 0 ? "primary" : "muted"}
        >
          <ManagerSwapsList swaps={managerPending} />
        </Section>
      )}

      <Section title="Mes propositions" count={proposed.length} accent="muted">
        <MySwapsList swaps={proposed} />
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent: "primary" | "muted";
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span
          className={
            accent === "primary"
              ? "bg-primary/15 text-primary inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums"
              : "bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums"
          }
        >
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}
