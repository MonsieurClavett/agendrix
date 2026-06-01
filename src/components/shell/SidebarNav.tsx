"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  TagIcon,
  CalendarCheck,
  PlaneTakeoff,
  Megaphone,
  ArrowRightLeft,
  LayoutTemplate,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Role } from "@/generated/prisma";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  managerOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: HomeIcon },
  { href: "/schedules", label: "Horaires", icon: CalendarIcon },
  { href: "/disponibilites", label: "Disponibilités", icon: CalendarCheck },
  { href: "/conges", label: "Congés", icon: PlaneTakeoff },
  { href: "/quarts-a-combler", label: "Quarts à combler", icon: Megaphone },
  { href: "/echanges", label: "Échanges", icon: ArrowRightLeft },
  { href: "/team", label: "Équipe", icon: UsersIcon, managerOnly: true },
  { href: "/positions", label: "Positions", icon: TagIcon, managerOnly: true },
  {
    href: "/templates",
    label: "Modèles",
    icon: LayoutTemplate,
    managerOnly: true,
  },
];

type Props = {
  role: Role;
  variant: "expanded" | "collapsed";
  onNavigate?: () => void;
};

export function SidebarNav({ role, variant, onNavigate }: Props) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => !i.managerOnly || role === "MANAGER");

  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;

        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              variant === "collapsed" && "justify-center px-0",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {variant === "expanded" && <span>{item.label}</span>}
          </Link>
        );

        if (variant === "collapsed") {
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        }

        return link;
      })}
    </nav>
  );
}
