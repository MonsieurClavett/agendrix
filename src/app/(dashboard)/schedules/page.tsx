import { requireTenantContext } from "@/lib/session";
import { listUsersInCompany } from "@/lib/repositories/user";
import {
  listShiftsForCompanyWeek,
  listShiftsForUserWeek,
} from "@/lib/repositories/shift";
import { listPositionsForCompany } from "@/lib/repositories/position";
import { parseWeekParam } from "@/lib/week";
import { ScheduleView } from "./_components/ScheduleView";

type Props = {
  searchParams: Promise<{ week?: string }>;
};

export default async function SchedulesPage({ searchParams }: Props) {
  const ctx = await requireTenantContext();
  const params = await searchParams;
  const today = new Date();
  const range = parseWeekParam(params.week, today);
  const isManager = ctx.role === "MANAGER";

  const [shifts, employees, positions] = await Promise.all([
    isManager
      ? listShiftsForCompanyWeek(ctx, range)
      : listShiftsForUserWeek(ctx, ctx.userId, range),
    isManager ? listUsersInCompany(ctx) : Promise.resolve([]),
    isManager ? listPositionsForCompany(ctx) : Promise.resolve([]),
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

      <ScheduleView
        shifts={shifts}
        range={range}
        employees={employees}
        positions={positions.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
        }))}
        canMutate={isManager}
        today={today}
      />
    </div>
  );
}
