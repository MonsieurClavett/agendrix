import { requireTenantContext } from "@/lib/session";
import { getCurrentCompany } from "@/lib/repositories/company";
import { getCurrentUser } from "@/lib/repositories/user";
import { AppShell } from "@/components/shell/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireTenantContext();
  const [company, user] = await Promise.all([
    getCurrentCompany(ctx),
    getCurrentUser(ctx),
  ]);

  return (
    <AppShell
      ctx={ctx}
      company={company}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</div>
    </AppShell>
  );
}
