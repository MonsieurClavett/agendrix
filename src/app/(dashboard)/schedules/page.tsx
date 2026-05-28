import { requireTenantContext } from "@/lib/session";
import { listUsersInCompany } from "@/lib/repositories/user";
import {
  listShiftsForCompanyWeek,
  listShiftsForUserWeek,
} from "@/lib/repositories/shift";
import { parseWeekParam, toISODate } from "@/lib/week";
import { ShiftDialog } from "./_components/ShiftDialog";
import { WeekNav } from "./_components/WeekNav";
import { WeekGrid } from "./_components/WeekGrid";

type Props = {
  searchParams: Promise<{ week?: string }>;
};

export default async function SchedulesPage({ searchParams }: Props) {
  // Constitution Principle V: server-authoritative auth. requireTenantContext
  // throws on no session; the proxy catches it before we get here, but the
  // layered check is the authoritative one.
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
      <div className="flex items-center justify-between">
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
        {isManager && (
          <ShiftDialog
            employees={employees}
            defaultDate={toISODate(range.start)}
          />
        )}
      </div>

      <WeekNav range={range} today={today} />

      <WeekGrid
        shifts={shifts}
        range={range}
        canMutate={isManager}
        employees={employees}
      />
    </div>
  );
}
