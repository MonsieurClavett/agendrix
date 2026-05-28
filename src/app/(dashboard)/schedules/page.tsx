import { requireTenantContext } from "@/lib/session";
import { listUsersInCompany } from "@/lib/repositories/user";
import {
  listShiftsForCompanyWeek,
  listShiftsForUserWeek,
} from "@/lib/repositories/shift";
import { parseWeekParam } from "@/lib/week";
import { ScheduleCalendar } from "./_components/ScheduleCalendar";
import { WeekNav } from "./_components/WeekNav";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {isManager ? "Horaires de l'équipe" : "Mes horaires"}
        </h1>
        <p className="text-muted-foreground">
          {isManager
            ? "Vue semaine de tous les employés de votre entreprise."
            : "Vos shifts pour la semaine sélectionnée."}
        </p>
      </div>

      <WeekNav range={range} today={today} />

      <ScheduleCalendar
        shifts={shifts}
        range={range}
        employees={employees}
        canMutate={isManager}
      />
    </div>
  );
}
