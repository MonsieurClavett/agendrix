import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { requireManagerContext } from "@/lib/session";
import {
  listAuditLogsForCompany,
  listDistinctActionsForCompany,
} from "@/lib/repositories/auditLog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { AuditTable } from "./_components/AuditTable";

type Props = {
  searchParams: Promise<{
    action?: string;
    entityType?: string;
    before?: string;
  }>;
};

const ACTION_LABELS: Record<string, string> = {
  "shift.published": "Publication d'une semaine",
  "shift.created": "Shift créé",
  "shift.updated": "Shift modifié",
  "shift.deleted": "Shift supprimé",
  "announcement.created": "Annonce publiée",
  "announcement.deleted": "Annonce supprimée",
  "timeoff.decided": "Décision de congé",
  "claim.decided": "Décision de candidature",
  "swap.decided": "Décision d'échange",
  "punchLocation.created": "Poste de pointage créé",
  "punchLocation.deleted": "Poste de pointage supprimé",
  "employee.invited": "Invitation d'employé",
  "employee.deactivated": "Employé désactivé",
  "employee.role_changed": "Rôle modifié",
};

export default async function AuditPage({ searchParams }: Props) {
  const ctx = await requireManagerContext();
  const params = await searchParams;

  const beforeDate =
    params.before && /^\d{4}-\d{2}-\d{2}T/.test(params.before)
      ? new Date(params.before)
      : undefined;

  const [rows, actions] = await Promise.all([
    listAuditLogsForCompany(ctx, {
      action: params.action,
      entityType: params.entityType,
      beforeDate,
      limit: 100,
    }),
    listDistinctActionsForCompany(ctx),
  ]);

  const oldest = rows[rows.length - 1];
  const olderHref = oldest
    ? (() => {
        const sp = new URLSearchParams();
        if (params.action) sp.set("action", params.action);
        if (params.entityType) sp.set("entityType", params.entityType);
        sp.set("before", oldest.createdAt.toISOString());
        return `/audit?${sp.toString()}`;
      })()
    : null;

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        eyebrow="Conformité"
        title="Journal d'audit"
        description="Historique en append-only des actions sensibles. Aucune entrée ne peut être modifiée ou supprimée."
      />

      {actions.length > 0 && (
        <div className="bg-card flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
          <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium">
            Filtres :
          </span>
          <Button asChild variant={params.action ? "ghost" : "outline"} size="sm">
            <Link href="/audit">Toutes actions</Link>
          </Button>
          {actions.map((a) => (
            <Button
              key={a}
              asChild
              variant={params.action === a ? "outline" : "ghost"}
              size="sm"
            >
              <Link href={`/audit?action=${encodeURIComponent(a)}`}>
                {ACTION_LABELS[a] ?? a}
              </Link>
            </Button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="size-5" />}
          title="Aucun événement enregistré"
          description="Les actions sensibles (publication, suppression, décisions) apparaîtront ici au fur et à mesure."
        />
      ) : (
        <>
          <AuditTable rows={rows} actionLabels={ACTION_LABELS} />
          {olderHref && rows.length === 100 && (
            <div className="flex justify-center pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href={olderHref}>Plus anciens →</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
