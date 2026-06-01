import { requireTenantContext } from "@/lib/session";
import { listUsersInCompany } from "@/lib/repositories/user";
import {
  listTimeOffForCompany,
  listTimeOffForEmployee,
} from "@/lib/repositories/timeOff";
import { EmployeeRequestList } from "./_components/EmployeeRequestList";
import { TimeOffPageClient } from "./_components/TimeOffPageClient";

export default async function TimeOffPage() {
  const ctx = await requireTenantContext();

  if (ctx.role !== "MANAGER") {
    const requests = await listTimeOffForEmployee(ctx, ctx.userId);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Mes congés</h1>
          <p className="text-muted-foreground text-sm">
            Soumettez vos demandes d'absence ; votre gestionnaire les
            approuvera ou les refusera.
          </p>
        </div>
        <EmployeeRequestList
          requests={requests}
          targetEmployeeId={ctx.userId}
        />
      </div>
    );
  }

  const [pending, decided, employees] = await Promise.all([
    listTimeOffForCompany(ctx, { statusIn: ["PENDING"] }),
    listTimeOffForCompany(ctx, { statusIn: ["APPROVED", "REJECTED"] }),
    listUsersInCompany(ctx),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Congés</h1>
        <p className="text-muted-foreground text-sm">
          Approuvez ou refusez les demandes de votre équipe.
        </p>
      </div>
      <TimeOffPageClient
        pending={pending}
        decided={decided}
        employees={employees.map((u) => ({ id: u.id, name: u.name }))}
        currentUserId={ctx.userId}
      />
    </div>
  );
}
