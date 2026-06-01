import Link from "next/link";
import { Sparkles } from "lucide-react";

import { requireTenantContext } from "@/lib/session";
import { getStatsForUser } from "@/lib/repositories/employeeStats";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { HeatmapCalendar } from "./_components/HeatmapCalendar";
import { DistributionBars } from "./_components/DistributionBars";
import { BadgesGrid } from "./_components/BadgesGrid";

type Props = {
  searchParams: Promise<{ since?: string }>;
};

const FRENCH_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatHours(min: number): string {
  return `${(min / 60).toFixed(1).replace(".", ",")}h`;
}

function preferenceMessage(
  worked: number,
  pref: { minHoursPerWeek: number | null; maxHoursPerWeek: number | null } | null,
  weeksSpan: number,
): { text: string; tone: "ok" | "below" | "above" | "none" } {
  if (!pref) return { text: "Aucune préférence déclarée", tone: "none" };
  if (pref.minHoursPerWeek === null && pref.maxHoursPerWeek === null) {
    return { text: "Aucune préférence déclarée", tone: "none" };
  }
  const avgPerWeek = worked / 60 / weeksSpan;
  if (pref.minHoursPerWeek !== null && avgPerWeek < pref.minHoursPerWeek) {
    return {
      text: `Sous votre fourchette de ${(pref.minHoursPerWeek - avgPerWeek).toFixed(1)}h/semaine en moyenne`,
      tone: "below",
    };
  }
  if (pref.maxHoursPerWeek !== null && avgPerWeek > pref.maxHoursPerWeek) {
    return {
      text: `Au-dessus de votre fourchette de ${(avgPerWeek - pref.maxHoursPerWeek).toFixed(1)}h/semaine`,
      tone: "above",
    };
  }
  return { text: "Vous êtes dans votre fourchette idéale", tone: "ok" };
}

export default async function MyStatsPage({ searchParams }: Props) {
  const ctx = await requireTenantContext();
  const params = await searchParams;

  const sinceDaysRaw = Number(params.since);
  const sinceDays =
    Number.isFinite(sinceDaysRaw) && sinceDaysRaw > 0 ? sinceDaysRaw : 30;

  const data = await getStatsForUser(ctx, { sinceDays });
  const weeksSpan = sinceDays / 7;
  const prefMsg = preferenceMessage(
    data.totalWorkedMinutes,
    data.preference,
    weeksSpan,
  );

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="Vous"
        title="Mes statistiques"
        description={`Aperçu de votre activité sur les ${sinceDays} derniers jours.`}
        action={
          <div className="flex gap-1">
            {[7, 30, 90].map((n) => (
              <Button
                key={n}
                asChild
                variant={sinceDays === n ? "outline" : "ghost"}
                size="sm"
              >
                <Link href={`/me/stats?since=${n}`}>{n}j</Link>
              </Button>
            ))}
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Heures travaillées
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatHours(data.totalWorkedMinutes)}
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Heures prévues
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatHours(data.totalScheduledMinutes)}
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Moyenne par jour
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatHours(data.avgWorkedMinutesPerWorkedDay)}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[10px]">
            {data.workedDaysCount} jour{data.workedDaysCount > 1 ? "s" : ""} travaillé
            {data.workedDaysCount > 1 ? "s" : ""}
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Ponctualité
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {data.punctualityPct !== null ? `${data.punctualityPct}%` : "—"}
          </div>
          {data.punctualSampleSize > 0 ? (
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              sur {data.punctualSampleSize} pointage
              {data.punctualSampleSize > 1 ? "s" : ""}
            </div>
          ) : (
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              pas encore de donnée
            </div>
          )}
        </div>
      </div>

      {/* Preference status */}
      {data.preference && (
        <div
          className={
            prefMsg.tone === "ok"
              ? "rounded-xl border border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 p-4 text-sm"
              : prefMsg.tone === "above"
                ? "rounded-xl border border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400 p-4 text-sm"
                : prefMsg.tone === "below"
                  ? "rounded-xl border border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-400 p-4 text-sm"
                  : "rounded-xl border bg-card text-muted-foreground p-4 text-sm"
          }
        >
          {prefMsg.text}
        </div>
      )}

      {/* Heatmap */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Activité quotidienne</h2>
        <HeatmapCalendar points={data.heatmap} />
      </section>

      {/* Distributions */}
      <div className="grid gap-5 md:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Par jour de la semaine</h2>
          <DistributionBars
            rows={data.byDayOfWeek.map((d) => ({
              label: FRENCH_DAYS[d.dayOfWeek - 1],
              value: d.workedMinutes,
            }))}
          />
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Par position (prévu)</h2>
          {data.byPosition.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucun shift sur la période.
            </p>
          ) : (
            <DistributionBars
              rows={data.byPosition.map((p) => ({
                label: p.positionName,
                value: p.scheduledMinutes,
              }))}
            />
          )}
        </section>
      </div>

      {/* Badges */}
      {data.badges.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary size-4" />
            <h2 className="text-sm font-semibold">Vos badges</h2>
          </div>
          <BadgesGrid badges={data.badges} />
        </section>
      )}
    </div>
  );
}
