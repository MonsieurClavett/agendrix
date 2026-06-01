import { Avatar } from "@/components/ui/avatar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { CommandPalette } from "@/components/CommandPalette";
import { CommandPaletteTrigger } from "@/components/CommandPaletteTrigger";
import { listEmployeesForPalette } from "@/lib/repositories/user";
import type { TenantContext } from "@/lib/session";
import { Sidebar } from "./Sidebar";
import { MobileSidebar } from "./MobileSidebar";

type Props = {
  ctx: TenantContext;
  company: { id: string; name: string };
  userName: string | null;
  userEmail: string;
  children: React.ReactNode;
};

export async function AppShell({
  ctx,
  company,
  userName,
  userEmail,
  children,
}: Props) {
  const displayName = userName ?? userEmail;
  const employees =
    ctx.role === "MANAGER" ? await listEmployeesForPalette(ctx) : [];
  return (
    <TooltipProvider delayDuration={200}>
      <CommandPalette role={ctx.role} employees={employees} />
      <div className="flex h-full min-h-screen">
        {/* Desktop / tablet sidebar */}
        <div className="hidden md:flex">
          <Sidebar
            role={ctx.role}
            company={company}
            userName={userName}
            userEmail={userEmail}
          />
        </div>

        {/* Right column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="bg-background/95 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
            <div className="md:hidden">
              <MobileSidebar role={ctx.role} />
            </div>
            <div className="min-w-0 flex-1 md:hidden">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Entreprise
              </p>
              <p className="truncate text-sm font-semibold">{company.name}</p>
            </div>
            <div className="hidden md:block flex-1" />
            <CommandPaletteTrigger />
            <NotificationsBell />
            <div className="hidden md:flex items-center gap-2.5 rounded-full border bg-card px-2 py-1">
              <Avatar name={displayName} size="sm" />
              <div className="pr-1 text-xs leading-tight">
                <p className="font-medium">{displayName}</p>
                <p className="text-muted-foreground text-[10px]">
                  {ctx.role === "MANAGER" ? "Gestionnaire" : "Employé"}
                </p>
              </div>
            </div>
            <div className="md:hidden">
              <Avatar name={displayName} size="sm" />
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
