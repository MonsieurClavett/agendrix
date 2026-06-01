import { requireTenantContext } from "@/lib/session";
import { listAvailabilitiesForEmployee } from "@/lib/repositories/availability";
import { AvailabilityWeekView } from "./_components/AvailabilityWeekView";

export default async function AvailabilityPage() {
  const ctx = await requireTenantContext();
  const ranges = await listAvailabilitiesForEmployee(ctx, ctx.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mes disponibilités</h1>
        <p className="text-muted-foreground text-sm">
          Déclarez ici les plages horaires de la semaine où vous êtes
          disponible. Ces informations aident votre gestionnaire à
          planifier les shifts qui vous conviennent.
        </p>
      </div>

      <AvailabilityWeekView
        ranges={ranges}
        targetEmployeeId={ctx.userId}
        canEdit={true}
      />
    </div>
  );
}
