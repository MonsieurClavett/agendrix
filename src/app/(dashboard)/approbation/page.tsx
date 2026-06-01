import Link from "next/link";
import { BadgeCheck } from "lucide-react";

import { requireManagerContext } from "@/lib/session";
import { listForWeek } from "@/lib/repositories/timesheetApproval";
import { mondayOfWeek, parseISODate, addDays, toISODate } from "@/lib/week";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ApprovalGrid } from "./_components/ApprovalGrid";

type Props = {
  searchParams: Promise<{ week?: string }>;
};

const FRENCH_MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function formatWeekLabel(monday: Date): string {
  const end = addDays(monday, 6);
  const sameMonth = monday.getMonth() === end.getMonth();
  const sameYear = monday.getFullYear() === end.getFullYear();
  if (sameMonth && sameYear) {
    return `${monday.getDate()}–${end.getDate()} ${FRENCH_MONTHS[monday.getMonth()]} ${monday.getFullYear()}`;
  }
  if (sameYear) {
    return `${monday.getDate()} ${FRENCH_MONTHS[monday.getMonth()]} – ${end.getDate()} ${FRENCH_MONTHS[end.getMonth()]} ${monday.getFullYear()}`;
  }
  return `${monday.getDate()} ${FRENCH_MONTHS[monday.getMonth()]} ${monday.getFullYear()} – ${end.getDate()} ${FRENCH_MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

export default async function ApprobationPage({ searchParams }: Props) {
  const ctx = await requireManagerContext();
  const params = await searchParams;
  const today = new Date();
  const anchor = parseISODate(params.week, today);
  const monday = mondayOfWeek(anchor);
  const entries = await listForWeek(ctx, monday);

  const prev = toISODate(addDays(monday, -7));
  const next = toISODate(addDays(monday, 7));
  const currentMonday = mondayOfWeek(today);
  const isCurrent = monday.getTime() === currentMonday.getTime();

  const pendingCount = entries.filter(
    (e) => e.status === "UNREVIEWED" || e.status === "PENDING",
  ).length;
  const approvedCount = entries.filter((e) => e.status === "APPROVED").length;

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        eyebrow="Paie"
        title="Approbation des heures"
        description="Validez les heures travaillées de chaque employé avant l'export final pour la paie."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Semaine
          </div>
          <div className="mt-1 text-sm font-semibold">
            {formatWeekLabel(monday)}
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            À approuver
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {pendingCount}
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Approuvées
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {approvedCount}
          </div>
        </div>
      </div>

      {/* Nav arrows */}
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm">
          <Link href={`/approbation?week=${prev}`}>← Semaine précédente</Link>
        </Button>
        {!isCurrent && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/approbation">Cette semaine</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href={`/approbation?week=${next}`}>Semaine suivante →</Link>
        </Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<BadgeCheck className="size-5" />}
          title="Aucun employé actif"
          description="Invitez des employés pour pouvoir valider leurs heures."
        />
      ) : (
        <ApprovalGrid
          entries={entries}
          weekStartISO={toISODate(monday)}
        />
      )}
    </div>
  );
}
