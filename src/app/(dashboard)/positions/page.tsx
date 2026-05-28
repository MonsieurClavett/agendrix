import { redirect } from "next/navigation";

import { requireTenantContext } from "@/lib/session";
import {
  countShiftsByPosition,
  listPositionsForCompany,
} from "@/lib/repositories/position";
import { Card, CardContent } from "@/components/ui/card";
import { AddPositionTrigger } from "./_components/AddPositionTrigger";
import { PositionsList } from "./_components/PositionsList";

export default async function PositionsPage() {
  const ctx = await requireTenantContext();
  if (ctx.role !== "MANAGER") {
    redirect("/dashboard?error=forbidden");
  }

  const [positions, shiftCounts] = await Promise.all([
    listPositionsForCompany(ctx),
    countShiftsByPosition(ctx),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Positions</h1>
          <p className="text-muted-foreground text-sm">
            Définissez les rôles dans lesquels vos employés peuvent être
            assignés.
          </p>
        </div>
        {positions.length > 0 && <AddPositionTrigger />}
      </div>

      {positions.length === 0 ? (
        <Card className="mx-auto max-w-md py-12">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg font-medium">Aucune position pour le moment.</p>
            <p className="text-muted-foreground text-sm">
              Créez votre première position (par exemple Service, Cuisine,
              Bar) pour pouvoir tagger vos shifts.
            </p>
            <AddPositionTrigger emptyState />
          </CardContent>
        </Card>
      ) : (
        <PositionsList
          positions={positions}
          shiftCountsByPositionId={shiftCounts}
        />
      )}
    </div>
  );
}
