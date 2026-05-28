import Link from "next/link";

import { requireTenantContext } from "@/lib/session";
import { getCurrentCompany } from "@/lib/repositories/company";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireTenantContext();
  const company = await getCurrentCompany(ctx);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Entreprise
            </p>
            <p className="font-medium">{company.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">Tableau de bord</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/schedules">Horaires</Link>
            </Button>
            {ctx.role === "MANAGER" && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/team">Équipe</Link>
              </Button>
            )}
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 p-6">{children}</div>
    </div>
  );
}
