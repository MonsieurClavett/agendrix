import Link from "next/link";
import { ScanLine, Users } from "lucide-react";

import { requireManagerContext } from "@/lib/session";
import { listPunchesForDay, pairPunches } from "@/lib/repositories/punch";
import { parseISODate } from "@/lib/week";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PunchesTable } from "./_components/PunchesTable";

type Props = {
  searchParams: Promise<{ date?: string }>;
};

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

const FRENCH_WEEKDAYS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];
const FRENCH_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function formatLongDate(d: Date): string {
  return `${FRENCH_WEEKDAYS[d.getDay()]} ${d.getDate()} ${FRENCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function PointagePage({ searchParams }: Props) {
  const ctx = await requireManagerContext();
  const params = await searchParams;
  const today = new Date();
  const date = parseISODate(params.date, today);

  const punches = await listPunchesForDay(ctx, date);

  // Compute "currently present" = employees with an open IN today.
  const sessionsAll = pairPunches(punches);
  const openSessions = sessionsAll.filter((s) => s.endsAt === null);
  const presentEmployees = new Set(openSessions.map((s) => s.inPunch.employeeId));

  const prev = toISODate(addDays(date, -1));
  const next = toISODate(addDays(date, 1));
  const isToday = toISODate(date) === toISODate(today);

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        eyebrow="Pointage"
        title="Pointages du jour"
        description="Visualisez les pointages en temps réel et l'écart entre l'horaire prévu et l'horaire réel."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <ScanLine className="text-primary size-4" />
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Pointages aujourd&apos;hui
            </span>
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {punches.length}
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Users className="text-primary size-4" />
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Présents
            </span>
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {presentEmployees.size}
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Date
          </div>
          <div className="mt-1 text-sm font-semibold">
            {formatLongDate(date)}
          </div>
        </div>
      </div>

      {/* Nav arrows */}
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm">
          <Link href={`/pointage?date=${prev}`}>← Jour précédent</Link>
        </Button>
        {!isToday && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/pointage">Aujourd&apos;hui</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href={`/pointage?date=${next}`}>Jour suivant →</Link>
        </Button>
      </div>

      {punches.length === 0 ? (
        <EmptyState
          icon={<ScanLine className="size-5" />}
          title="Aucun pointage pour cette date"
          description="Les employés n'ont pas encore pointé. Assurez-vous qu'ils ont scanné le QR code du poste."
        />
      ) : (
        <PunchesTable
          punches={punches.map((p) => ({
            id: p.id,
            type: p.type,
            punchedAt: p.punchedAt,
            employeeName: p.employee.name ?? p.employee.email,
            locationName: p.location?.name ?? "Poste supprimé",
          }))}
        />
      )}
    </div>
  );
}
