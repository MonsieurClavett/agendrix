import Link from "next/link";
import { BarChart3, Download } from "lucide-react";

import { requireManagerContext } from "@/lib/session";
import { getReportForRange } from "@/lib/repositories/reports";
import { parseISODate, toISODate } from "@/lib/week";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ReportFilters } from "./_components/ReportFilters";
import { ReportTables } from "./_components/ReportTables";

type Props = {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
};

function formatRangeLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const FRENCH_MONTHS_SHORT = [
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
  const fmt = (d: Date, withYear: boolean) =>
    `${d.getDate()} ${FRENCH_MONTHS_SHORT[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;
  return sameYear
    ? `${fmt(start, false)} – ${fmt(end, true)}`
    : `${fmt(start, true)} – ${fmt(end, true)}`;
}

export default async function RapportsPage({ searchParams }: Props) {
  const ctx = await requireManagerContext();
  const params = await searchParams;

  const today = new Date();
  const fallbackStart = new Date(today);
  fallbackStart.setDate(fallbackStart.getDate() - 6);

  const startDate = parseISODate(params.startDate, fallbackStart);
  const endDate = parseISODate(params.endDate, today);

  const data = await getReportForRange(ctx, { startDate, endDate });

  const startIso = toISODate(data.range.startDate);
  const endIso = toISODate(data.range.endDate);

  const csvHrefEmployee = `/api/reports/csv?startDate=${startIso}&endDate=${endIso}&kind=employee`;
  const csvHrefPosition = `/api/reports/csv?startDate=${startIso}&endDate=${endIso}&kind=position`;

  const totals = data.totals;
  const totalScheduledH = Math.round((totals.scheduledMinutes / 60) * 10) / 10;
  const totalWorkedH = Math.round((totals.workedMinutes / 60) * 10) / 10;
  const variance = totals.varianceMinutes;
  const varianceH =
    Math.round((Math.abs(variance) / 60) * 10) / 10;

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        eyebrow="Analyses"
        title="Rapports"
        description={`Période analysée : ${formatRangeLabel(data.range.startDate, data.range.endDate)}.`}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href={csvHrefPosition} download>
                <Download />
                Position
              </a>
            </Button>
            <Button asChild>
              <a href={csvHrefEmployee} download>
                <Download />
                Employés CSV
              </a>
            </Button>
          </div>
        }
      />

      <ReportFilters
        initialStartDate={startIso}
        initialEndDate={endIso}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Heures prévues"
          value={`${totalScheduledH}h`}
          accent={`${data.totals.activeEmployees} employé${data.totals.activeEmployees > 1 ? "s" : ""}`}
        />
        <StatCard
          label="Heures travaillées"
          value={`${totalWorkedH}h`}
          accent="sessions fermées"
        />
        <StatCard
          label="Écart"
          value={`${variance >= 0 ? "+" : "-"}${varianceH}h`}
          accent={
            variance >= 0
              ? "heures supplémentaires"
              : "heures manquantes"
          }
          tone={
            variance > 60 || variance < -60
              ? "warn"
              : "neutral"
          }
        />
        <StatCard
          label="Postes occupés"
          value={String(data.perPosition.length)}
          accent="positions différentes"
        />
      </div>

      {data.perEmployee.length === 0 && data.perPosition.length === 0 ? (
        <div className="bg-card flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
          <div className="bg-primary/10 text-primary mb-4 inline-flex size-12 items-center justify-center rounded-full">
            <BarChart3 className="size-5" />
          </div>
          <h3 className="text-base font-semibold">
            Aucune donnée pour cette période
          </h3>
          <p className="text-muted-foreground mt-1 max-w-md text-sm">
            Élargissez la plage de dates, ou assurez-vous que des shifts ont été
            publiés et des pointages enregistrés pendant cette période.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/rapports">7 derniers jours</Link>
          </Button>
        </div>
      ) : (
        <ReportTables
          perEmployee={data.perEmployee}
          perPosition={data.perPosition}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  tone = "neutral",
}: {
  label: string;
  value: string;
  accent?: string;
  tone?: "neutral" | "warn";
}) {
  return (
    <div
      className={
        tone === "warn"
          ? "bg-card border-amber-500/40 brand-gradient rounded-xl border p-4"
          : "bg-card rounded-xl border p-4"
      }
    >
      <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {accent && (
        <div className="text-muted-foreground mt-1 text-xs">{accent}</div>
      )}
    </div>
  );
}
