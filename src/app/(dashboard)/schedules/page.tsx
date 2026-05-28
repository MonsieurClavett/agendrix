import { requireTenantContext } from "@/lib/session";
import { listUsersInCompany } from "@/lib/repositories/user";
import {
  listShiftsForCompanyWeek,
  listShiftsForUserWeek,
} from "@/lib/repositories/shift";
import { parseWeekParam } from "@/lib/week";
import { FilterPanel } from "./_components/FilterPanel";
import { ScheduleCalendar } from "./_components/ScheduleCalendar";

type Props = {
  searchParams: Promise<{ week?: string }>;
};

export default async function SchedulesPage({ searchParams }: Props) {
  const ctx = await requireTenantContext();
  const params = await searchParams;
  const today = new Date();
  const range = parseWeekParam(params.week, today);
  const isManager = ctx.role === "MANAGER";

  const [shifts, employees] = await Promise.all([
    isManager
      ? listShiftsForCompanyWeek(ctx, range)
      : listShiftsForUserWeek(ctx, ctx.userId, range),
    isManager ? listUsersInCompany(ctx) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {isManager ? "Horaires de l'équipe" : "Mes horaires"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isManager
            ? "Vue semaine de tous les employés de votre entreprise."
            : "Vos shifts pour la semaine sélectionnée."}
        </p>
      </div>

      <div className="flex gap-4">
        <FilterPanel />
        <div className="min-w-0 flex-1">
          <ScheduleCalendar
            shifts={shifts}
            range={range}
            employees={employees}
            canMutate={isManager}
            today={today}
          />
        </div>
      </div>
    </div>
  );
}
