import { requireManagerContext } from "@/lib/session";
import { listAllUsersInCompany } from "@/lib/repositories/user";
import { InviteEmployeeDialog } from "./_components/InviteEmployeeDialog";
import { TeamTable } from "./_components/TeamTable";

export default async function TeamPage() {
  // Principle V: layered defense. The layout already redirects non-managers,
  // but the page re-checks because Server Component composition isn't a
  // security boundary on its own.
  const ctx = await requireManagerContext();
  const users = await listAllUsersInCompany(ctx);

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

      <TeamTable users={users} currentUserId={ctx.userId} />
    </div>
  );
}
