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
  Newspaper,
  SlidersHorizontal,
  ScanLine,
  MapPin,
  History,
  BarChart3,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  managerOnly?: boolean;
};

/** Single source of truth shared by SidebarNav and CommandPalette. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: HomeIcon },
  { href: "/schedules", label: "Horaires", icon: CalendarIcon },
  { href: "/disponibilites", label: "Disponibilités", icon: CalendarCheck },
  { href: "/preferences", label: "Préférences", icon: SlidersHorizontal },
  { href: "/conges", label: "Congés", icon: PlaneTakeoff },
  { href: "/quarts-a-combler", label: "Quarts à combler", icon: Megaphone },
  { href: "/echanges", label: "Échanges", icon: ArrowRightLeft },
  { href: "/annonces", label: "Annonces", icon: Newspaper },
  { href: "/me/pointage", label: "Mes pointages", icon: History },
  { href: "/team", label: "Équipe", icon: UsersIcon, managerOnly: true },
  { href: "/positions", label: "Positions", icon: TagIcon, managerOnly: true },
  {
    href: "/templates",
    label: "Modèles",
    icon: LayoutTemplate,
    managerOnly: true,
  },
  {
    href: "/punch-locations",
    label: "Postes",
    icon: MapPin,
    managerOnly: true,
  },
  {
    href: "/pointage",
    label: "Pointage",
    icon: ScanLine,
    managerOnly: true,
  },
  {
    href: "/rapports",
    label: "Rapports",
    icon: BarChart3,
    managerOnly: true,
  },
];
