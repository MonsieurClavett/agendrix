"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  Newspaper,
  MapPin,
  UserPlus,
  UserIcon,
  RotateCcw,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { NAV_ITEMS } from "@/components/shell/nav-items";
import {
  readRecents,
  pushRecent,
  type RecentItem,
} from "@/lib/command-palette-recents";
import type { Role } from "@/generated/prisma";

export const OPEN_COMMAND_PALETTE_EVENT = "agendrix:open-command-palette";

type EmployeeForPalette = {
  id: string;
  name: string | null;
  email: string;
};

type Props = {
  role: Role;
  employees: EmployeeForPalette[];
};

const QUICK_ACTIONS: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: "/schedules?createShift=1",
    label: "Créer un shift cette semaine",
    icon: <PlusIcon />,
  },
  {
    href: "/annonces?new=1",
    label: "Nouvelle annonce",
    icon: <Newspaper />,
  },
  {
    href: "/punch-locations?new=1",
    label: "Nouveau poste de pointage",
    icon: <MapPin />,
  },
  {
    href: "/team?invite=1",
    label: "Inviter un employé",
    icon: <UserPlus />,
  },
];

export function CommandPalette({ role, employees }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [recents, setRecents] = React.useState<RecentItem[]>([]);

  const isManager = role === "MANAGER";
  const visibleNav = NAV_ITEMS.filter((i) => !i.managerOnly || isManager);
  const allowedHrefs = React.useMemo(
    () => new Set(visibleNav.map((i) => i.href)),
    [visibleNav],
  );

  // Refresh recents when palette opens (drop stale items not in allowed nav).
  React.useEffect(() => {
    if (open) {
      const all = readRecents();
      setRecents(all.filter((r) => allowedHrefs.has(r.href)));
      setQuery("");
    }
  }, [open, allowedHrefs]);

  // Global keyboard shortcut (Cmd+K / Ctrl+K).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Header trigger button dispatches a CustomEvent we listen to here.
  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
  }, []);

  const navigate = (href: string, label: string) => {
    pushRecent({ href, label });
    setOpen(false);
    router.push(href);
  };

  const queryTrim = query.trim();
  const showEmployeeGroup =
    isManager && queryTrim.length >= 1 && employees.length > 0;
  // cmdk does its own fuzzy filter, but for employees we want to surface
  // results only when the user typed something — we still pass the full
  // list and let cmdk filter, but hide the group entirely when empty query.

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Rechercher une page, une action, un employé…"
      />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>

        {recents.length > 0 && queryTrim.length === 0 && (
          <>
            <CommandGroup heading="Récents">
              {recents.map((r) => (
                <CommandItem
                  key={`recent:${r.href}`}
                  value={`recent ${r.label}`}
                  onSelect={() => navigate(r.href, r.label)}
                >
                  <RotateCcw />
                  <span>{r.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigation">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`nav ${item.label}`}
                onSelect={() => navigate(item.href, item.label)}
              >
                <Icon />
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {isManager && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Actions rapides">
              {QUICK_ACTIONS.map((a) => (
                <CommandItem
                  key={a.href}
                  value={`action ${a.label}`}
                  onSelect={() => navigate(a.href, a.label)}
                >
                  {a.icon}
                  <span>{a.label}</span>
                  <CommandShortcut>Action</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {showEmployeeGroup && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Employés">
              {employees.map((emp) => {
                const display = emp.name ?? emp.email;
                return (
                  <CommandItem
                    key={`emp:${emp.id}`}
                    value={`employee ${display} ${emp.email}`}
                    onSelect={() =>
                      navigate("/team", `Voir le profil de ${display}`)
                    }
                  >
                    <UserIcon />
                    <span>{display}</span>
                    {emp.name && (
                      <CommandShortcut>{emp.email}</CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
