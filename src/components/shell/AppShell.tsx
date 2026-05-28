import { Avatar } from "@/components/ui/avatar";
import { TooltipProvider } from "@/components/ui/tooltip";
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

export function AppShell({
  ctx,
  company,
  userName,
  userEmail,
  children,
}: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full min-h-screen">
        {/* Desktop / tablet sidebar */}
        <div className="hidden md:flex">
          <Sidebar role={ctx.role} />
        </div>

        {/* Right column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="bg-background sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 md:px-6">
            <div className="md:hidden">
              <MobileSidebar role={ctx.role} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Entreprise
              </p>
              <p className="truncate text-sm font-semibold">{company.name}</p>
            </div>
            <Avatar name={userName ?? userEmail} size="sm" />
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
