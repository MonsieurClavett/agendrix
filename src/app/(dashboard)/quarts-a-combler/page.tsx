import { requireTenantContext } from "@/lib/session";
import { listOpenShiftsForCompanyWeek } from "@/lib/repositories/shift";
import { listClaimsForEmployee } from "@/lib/repositories/shiftClaim";
import { parseWeekParam } from "@/lib/week";
import type { ClaimRow } from "@/lib/repositories/shiftClaim";
import { OpenShiftsList } from "./_components/OpenShiftsList";

type Props = {
  searchParams: Promise<{ week?: string }>;
};

export default async function OpenShiftsPage({ searchParams }: Props) {
  const ctx = await requireTenantContext();
  const params = await searchParams;
  const today = new Date();
  const range = parseWeekParam(params.week, today);

  const [openShifts, myClaims] = await Promise.all([
    listOpenShiftsForCompanyWeek(ctx, range),
    listClaimsForEmployee(ctx, ctx.userId),
  ]);

  const myClaimByShift: Record<string, ClaimRow> = {};
  for (const c of myClaims) {
    if (!myClaimByShift[c.shiftId]) myClaimByShift[c.shiftId] = c;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Quarts à combler</h1>
        <p className="text-muted-foreground text-sm">
          Les quarts ouverts à toute l'équipe pour la semaine en cours.
          Demandez celui qui vous intéresse — votre gestionnaire décidera.
        </p>
      </div>
      <OpenShiftsList
        openShifts={openShifts}
        myClaimByShift={myClaimByShift}
      />
    </div>
  );
}
