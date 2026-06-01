import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "./SidebarNav";
import type { Role } from "@/generated/prisma";

type Props = {
  role: Role;
  company: { id: string; name: string };
  userName: string | null;
  userEmail: string;
};

export function Sidebar({ role, company, userName, userEmail }: Props) {
  const displayName = userName ?? userEmail;
  return (
    <aside className="bg-card flex h-full w-16 shrink-0 flex-col border-r lg:w-60">
      <div className="flex h-14 items-center border-b px-3">
        <Link
          href="/dashboard"
          className="hover:opacity-80 flex items-center gap-2.5 font-semibold tracking-tight transition-opacity"
        >
          <span
            className="bg-primary text-primary-foreground inline-flex size-8 items-center justify-center rounded-lg text-sm shadow-sm"
            aria-hidden="true"
          >
            A
          </span>
          <span className="hidden lg:flex flex-col leading-tight">
            <span className="text-sm">Agendrix</span>
            <span className="text-muted-foreground truncate text-[10px] font-normal max-w-[140px]">
              {company.name}
            </span>
          </span>
        </Link>
      </div>

      <div className="flex-1 py-3">
        {/* Two render passes: collapsed (md..lg-1) and expanded (lg+). */}
        <div className="lg:hidden">
          <SidebarNav role={role} variant="collapsed" />
        </div>
        <div className="hidden lg:block">
          <SidebarNav role={role} variant="expanded" />
        </div>
      </div>

      <Separator />
      <div className="flex flex-col gap-2 p-3">
        <div className="hidden lg:flex items-center gap-2 rounded-lg border bg-background/50 px-2 py-1.5">
          <Avatar name={displayName} size="sm" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-medium">{displayName}</p>
            <p className="text-muted-foreground truncate text-[10px]">
              {role === "MANAGER" ? "Gestionnaire" : "Employé"}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-1">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
