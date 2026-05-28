"use client";

import * as React from "react";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SidebarNav } from "./SidebarNav";
import type { Role } from "@/generated/prisma";

type Props = {
  role: Role;
};

export function MobileSidebar({ role }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground inline-flex size-7 items-center justify-center rounded-md text-sm">
              A
            </span>
            Agendrix
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 py-4">
          <SidebarNav
            role={role}
            variant="expanded"
            onNavigate={() => setOpen(false)}
          />
        </div>
        <Separator />
        <div className="flex flex-col gap-2 p-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
