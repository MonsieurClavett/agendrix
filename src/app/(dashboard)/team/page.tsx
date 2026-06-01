import { requireManagerContext } from "@/lib/session";
import { listAllUsersInCompany } from "@/lib/repositories/user";
import {
  listAvailabilitiesForCompany,
  type AvailabilityRow,
} from "@/lib/repositories/availability";
import { listInvitationsForCompany } from "@/lib/repositories/invitation";
import { listPreferencesForCompany } from "@/lib/repositories/employeePreference";
import { PageHeader } from "@/components/ui/page-header";
import { InviteEmployeeDialog } from "./_components/InviteEmployeeDialog";
import { PendingInvitationsList } from "./_components/PendingInvitationsList";
import { TeamTable } from "./_components/TeamTable";

export default async function TeamPage() {
  // Principle V: layered defense. The layout already redirects non-managers,
  // but the page re-checks because Server Component composition isn't a
  // security boundary on its own.
  const ctx = await requireManagerContext();
  const [users, allRanges, invitations, prefsMap] = await Promise.all([
    listAllUsersInCompany(ctx),
    listAvailabilitiesForCompany(ctx),
    listInvitationsForCompany(ctx),
    listPreferencesForCompany(ctx),
  ]);

  const rangesByEmployee = new Map<string, AvailabilityRow[]>();
  for (const r of allRanges) {
    const list = rangesByEmployee.get(r.employeeId) ?? [];
    list.push(r);
    rangesByEmployee.set(r.employeeId, list);
  }
  const rangesObject: Record<string, AvailabilityRow[]> = {};
  for (const [k, v] of rangesByEmployee.entries()) rangesObject[k] = v;

  const preferencesObject: Record<
    string,
    {
      minHoursPerWeek: number | null;
      maxHoursPerWeek: number | null;
      preferredDays: number[];
      notes: string | null;
    }
  > = {};
  for (const [k, v] of prefsMap.entries()) {
    preferencesObject[k] = {
      minHoursPerWeek: v.minHoursPerWeek,
      maxHoursPerWeek: v.maxHoursPerWeek,
      preferredDays: v.preferredDays,
      notes: v.notes,
    };
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        eyebrow="Personnel"
        title="Équipe"
        description="Gérez les comptes, invitations et préférences de votre entreprise."
        action={<InviteEmployeeDialog />}
      />

      <PendingInvitationsList invitations={invitations} />

      <TeamTable
        users={users}
        currentUserId={ctx.userId}
        rangesByEmployee={rangesObject}
        preferencesByEmployee={preferencesObject}
      />
    </div>
  );
}
