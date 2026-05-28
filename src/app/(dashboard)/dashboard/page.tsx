import { requireTenantContext } from "@/lib/session";
import { getCurrentCompany } from "@/lib/repositories/company";
import { listUsersInCompany } from "@/lib/repositories/user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  // Constitution Principle I: every data access starts here. The repos require
  // ctx and inject where: { companyId: ctx.companyId } — no cross-tenant leak
  // is structurally possible unless this layer is bypassed.
  const ctx = await requireTenantContext();
  const [company, users] = await Promise.all([
    getCurrentCompany(ctx),
    listUsersInCompany(ctx),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue dans <strong>{company.name}</strong>. Votre rôle :{" "}
          <strong>{ctx.role}</strong>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employés ({users.length})</CardTitle>
          <CardDescription>
            Démonstration de la couche tenant : ces lignes proviennent
            forcément de votre entreprise — impossible d&apos;en afficher
            d&apos;autres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="font-medium">{u.name ?? "(sans nom)"}</p>
                  <p className="text-muted-foreground text-sm">{u.email}</p>
                </div>
                <span className="text-muted-foreground text-xs uppercase">
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
