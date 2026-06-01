import { requireManagerContext } from "@/lib/session";
import { listAllUsersInCompany } from "@/lib/repositories/user";
import {
  listAvailabilitiesForCompany,
  type AvailabilityRow,
} from "@/lib/repositories/availability";
import { InviteEmployeeDialog } from "./_components/InviteEmployeeDialog";
import { TeamTable } from "./_components/TeamTable";

export default async function TeamPage() {
  // Principle V: layered defense. The layout already redirects non-managers,
  // but the page re-checks because Server Component composition isn't a
  // security boundary on its own.
  const ctx = await requireManagerContext();
  const [users, allRanges] = await Promise.all([
    listAllUsersInCompany(ctx),
    listAvailabilitiesForCompany(ctx),
  ]);

  const rangesByEmployee = new Map<string, AvailabilityRow[]>();
  for (const r of allRanges) {
    const list = rangesByEmployee.get(r.employeeId) ?? [];
    list.push(r);
    rangesByEmployee.set(r.employeeId, list);
  }
  const rangesObject: Record<string, AvailabilityRow[]> = {};
  for (const [k, v] of rangesByEmployee.entries()) rangesObject[k] = v;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Équipe</h1>
          <p className="text-muted-foreground">
            Gérez les comptes de votre entreprise.
          </p>
        </div>
        <InviteEmployeeDialog />
      </div>

      <TeamTable
        users={users}
        currentUserId={ctx.userId}
        rangesByEmployee={rangesObject}
      />
    </div>
  );
}
