import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "./SidebarNav";
import type { Role } from "@/generated/prisma";

type Props = {
  role: Role;
};

export function Sidebar({ role }: Props) {
  return (
    <aside className="bg-card flex h-full w-16 shrink-0 flex-col border-r lg:w-56">
      <div className="flex h-14 items-center justify-center border-b px-3 lg:justify-start">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="bg-primary text-primary-foreground inline-flex size-7 items-center justify-center rounded-md text-sm">
            A
          </span>
          <span className="hidden lg:inline">Agendrix</span>
        </Link>
      </div>

      <div className="flex-1 py-4">
        {/* Two render passes: collapsed (md..lg-1) and expanded (lg+).
            Tailwind handles the visibility; both mount but only one shows. */}
        <div className="lg:hidden">
          <SidebarNav role={role} variant="collapsed" />
        </div>
        <div className="hidden lg:block">
          <SidebarNav role={role} variant="expanded" />
        </div>
      </div>

      <Separator />
      <div className="flex flex-col gap-2 p-3">
        <div className="flex justify-center lg:justify-start">
          <ThemeToggle />
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
