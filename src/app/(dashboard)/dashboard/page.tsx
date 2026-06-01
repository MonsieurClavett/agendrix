import Link from "next/link";
import {
  CalendarIcon,
  CalendarCheck,
  PlaneTakeoff,
  Megaphone,
  ArrowRightLeft,
  Users,
  TagIcon,
  LayoutTemplate,
  ArrowUpRight,
  Newspaper,
  PinIcon,
} from "lucide-react";

import { requireTenantContext } from "@/lib/session";
import { getCurrentCompany } from "@/lib/repositories/company";
import { listUsersInCompany } from "@/lib/repositories/user";
import { listPositionsForCompany } from "@/lib/repositories/position";
import {
  countDraftsForCompanyWeek,
  listShiftsForCompanyWeek,
  listShiftsForUserWeek,
} from "@/lib/repositories/shift";
import { countPendingClaimsForCompany } from "@/lib/repositories/shiftClaim";
import { listSwapsForUser } from "@/lib/repositories/shiftSwap";
import { listTemplates } from "@/lib/repositories/scheduleTemplate";
import { listAnnouncementsForDashboard } from "@/lib/repositories/announcement";
import { mondayOfWeek, weekRangeFrom } from "@/lib/week";
import { formatRelativeDate } from "@/lib/notifications";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const ctx = await requireTenantContext();
  const today = new Date();
  const range = weekRangeFrom(mondayOfWeek(today));
  const isManager = ctx.role === "MANAGER";

  const [
    company,
    users,
    positions,
    weekShifts,
    draftCount,
    pendingClaims,
    swapBuckets,
    templates,
    announcements,
    params,
  ] = await Promise.all([
    getCurrentCompany(ctx),
    listUsersInCompany(ctx),
    isManager ? listPositionsForCompany(ctx) : Promise.resolve([]),
    isManager
      ? listShiftsForCompanyWeek(ctx, range)
      : listShiftsForUserWeek(ctx, ctx.userId, range),
    isManager ? countDraftsForCompanyWeek(ctx, range) : Promise.resolve(0),
    isManager ? countPendingClaimsForCompany(ctx) : Promise.resolve(0),
    listSwapsForUser(ctx),
    isManager ? listTemplates(ctx) : Promise.resolve([]),
    listAnnouncementsForDashboard(ctx),
    searchParams,
  ]);

  const flash =
    params.error === "forbidden"
      ? "Vous n'avez pas accès à la gestion d'équipe."
      : null;

  const weekHours = weekShifts.reduce(
    (acc, s) => acc + (s.endsAt.getTime() - s.startsAt.getTime()) / 3_600_000,
    0,
  );

  const todayShifts = weekShifts.filter(
    (s) =>
      s.startsAt.toDateString() === today.toDateString() ||
      (s.startsAt <= today && s.endsAt >= today),
  );

  const swapAttention = isManager
    ? swapBuckets.managerPending.length
    : swapBuckets.incoming.length;

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return "Bon matin";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  })();
  const firstName =
    (users.find((u) => u.id === ctx.userId)?.name ?? "").split(" ")[0] || "";

  return (
    <div className="page-enter space-y-6">
      {flash && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {flash}
        </div>
      )}

      <PageHeader
        eyebrow={company.name}
        title={
          firstName ? `${greeting}, ${firstName} 👋` : `${greeting} 👋`
        }
        description={
          isManager
            ? "Voici un aperçu de votre semaine et des actions qui demandent votre attention."
            : "Voici vos prochains shifts et les actions qui vous concernent."
        }
        action={
          <Button asChild>
            <Link href="/schedules">
              <CalendarIcon className="size-4" />
              Voir le calendrier
            </Link>
          </Button>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={isManager ? "Shifts cette semaine" : "Vos shifts cette semaine"}
          value={weekShifts.length}
          accent={`${Math.round(weekHours)}h planifiées`}
          icon={<CalendarIcon className="size-4" />}
          href="/schedules"
        />
        <StatCard
          label={isManager ? "Équipe active" : "Aujourd'hui"}
          value={isManager ? users.length : todayShifts.length}
          accent={
            isManager
              ? `${positions.length} position${positions.length > 1 ? "s" : ""}`
              : todayShifts.length === 0
                ? "Repos"
                : "shifts aujourd'hui"
          }
          icon={isManager ? <Users className="size-4" /> : <CalendarCheck className="size-4" />}
          href={isManager ? "/team" : "/schedules"}
        />
        <StatCard
          label={isManager ? "Brouillons à publier" : "Mes propositions"}
          value={isManager ? draftCount : swapBuckets.proposed.length}
          accent={
            isManager
              ? draftCount > 0 ? "à publier" : "tout est publié"
              : "échanges en cours"
          }
          icon={isManager ? <Megaphone className="size-4" /> : <ArrowRightLeft className="size-4" />}
          href={isManager ? "/schedules" : "/echanges"}
          highlight={isManager && draftCount > 0}
        />
        <StatCard
          label={isManager ? "À traiter" : "Demandes pour moi"}
          value={
            (isManager ? pendingClaims : 0) + swapAttention
          }
          accent={
            isManager
              ? `${pendingClaims} candidatures · ${swapAttention} échanges`
              : `${swapAttention} échanges`
          }
          icon={<ArrowUpRight className="size-4" />}
          href={isManager ? "/quarts-a-combler" : "/echanges"}
          highlight={(isManager ? pendingClaims : 0) + swapAttention > 0}
        />
      </div>

      {announcements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]">
              Annonces récentes
            </h2>
            <Link
              href="/annonces"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Tout voir →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {announcements.map((a) => (
              <Link
                key={a.id}
                href="/annonces"
                className={cn(
                  "lift-on-hover bg-card relative block rounded-xl border p-4",
                  a.isPinned && "border-primary/40 brand-gradient",
                )}
              >
                {a.isPinned && (
                  <PinIcon className="text-primary absolute top-3 right-3 size-3.5" />
                )}
                <div className="flex items-center gap-2 text-xs">
                  <Newspaper className="text-muted-foreground size-3.5" />
                  <span className="text-muted-foreground">
                    {formatRelativeDate(a.createdAt)}
                  </span>
                </div>
                <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold">
                  {a.title}
                </h3>
                {a.body && (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                    {a.body}
                  </p>
                )}
                {a.author && (
                  <p className="text-muted-foreground/80 mt-2 text-[11px]">
                    par {a.author.name ?? a.author.email}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-muted-foreground px-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
            Accès rapides
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <QuickLink
              href="/schedules"
              label="Calendrier"
              icon={<CalendarIcon className="size-5" />}
            />
            <QuickLink
              href="/disponibilites"
              label="Disponibilités"
              icon={<CalendarCheck className="size-5" />}
            />
            <QuickLink
              href="/conges"
              label="Congés"
              icon={<PlaneTakeoff className="size-5" />}
            />
            <QuickLink
              href="/quarts-a-combler"
              label="Quarts à combler"
              icon={<Megaphone className="size-5" />}
            />
            <QuickLink
              href="/echanges"
              label="Échanges"
              icon={<ArrowRightLeft className="size-5" />}
            />
            <QuickLink
              href="/annonces"
              label="Annonces"
              icon={<Newspaper className="size-5" />}
            />
            {isManager && (
              <>
                <QuickLink
                  href="/team"
                  label="Équipe"
                  icon={<Users className="size-5" />}
                />
                <QuickLink
                  href="/positions"
                  label="Positions"
                  icon={<TagIcon className="size-5" />}
                />
                <QuickLink
                  href="/templates"
                  label="Modèles"
                  icon={<LayoutTemplate className="size-5" />}
                />
              </>
            )}
          </div>
        </div>

        {/* Team peek (manager only) */}
        {isManager && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]">
                Équipe
              </h2>
              <Link
                href="/team"
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Tout voir →
              </Link>
            </div>
            <div className="bg-card rounded-xl border">
              <ul className="divide-y">
                {users.slice(0, 6).map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <Avatar name={u.name ?? u.email} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {u.name ?? u.email}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {u.role === "MANAGER" ? "Gestionnaire" : "Employé"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {users.length > 6 && (
                <div className="border-t px-4 py-2 text-center">
                  <Link
                    href="/team"
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    {users.length - 6} autres employés
                  </Link>
                </div>
              )}
            </div>

            {templates.length > 0 && (
              <>
                <h2 className="text-muted-foreground mt-5 px-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Modèles d&apos;horaire
                </h2>
                <div className="bg-card rounded-xl border p-1">
                  <ul className="space-y-0.5">
                    {templates.slice(0, 4).map((t) => (
                      <li key={t.id}>
                        <Link
                          href="/templates"
                          className="hover:bg-accent flex items-center justify-between rounded-md px-3 py-2 text-sm"
                        >
                          <span className="truncate font-medium">{t.name}</span>
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {t._count.shifts} shifts
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
  href,
  highlight,
}: {
  label: string;
  value: number;
  accent?: string;
  icon: React.ReactNode;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "lift-on-hover bg-card group relative flex flex-col gap-2 overflow-hidden rounded-xl border p-4",
        highlight && "border-primary/40 brand-gradient",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
        <span
          className={cn(
            "text-muted-foreground transition-colors group-hover:text-primary",
          )}
        >
          {icon}
        </span>
      </div>
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      {accent && (
        <div className="text-muted-foreground text-xs">{accent}</div>
      )}
    </Link>
  );
}

function QuickLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="lift-on-hover bg-card group flex items-center gap-3 rounded-xl border p-3.5"
    >
      <span className="bg-primary/10 text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </span>
      <span className="truncate text-sm font-medium">{label}</span>
    </Link>
  );
}
