"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutTemplate,
  PlusIcon,
  SearchIcon,
  Save,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addDays,
  mondayOfWeek,
  nextAnchor,
  prevAnchor,
  toISODate,
  type CalendarView,
  type WeekRange,
} from "@/lib/week";
import { PublishWeekDialog } from "./PublishWeekDialog";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import {
  ApplyTemplateDialog,
  type TemplateOption,
} from "./ApplyTemplateDialog";

type Props = {
  range: WeekRange;
  today: Date;
  canMutate: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onCreateClick: () => void;
  draftCount: number;
  templates: TemplateOption[];
  view: CalendarView;
  anchor: Date;
};

const FRENCH_MONTHS_SHORT = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function formatRangeLabel(range: WeekRange, view: CalendarView): string {
  const start = range.start;
  if (view === "day") {
    return `${start.getDate()} ${FRENCH_MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  }
  const span = view === "2week" ? 14 : 7;
  const end = addDays(range.start, span - 1);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameMonth && sameYear) {
    return `${start.getDate()}–${end.getDate()} ${FRENCH_MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  }
  if (sameYear) {
    return `${start.getDate()} ${FRENCH_MONTHS_SHORT[start.getMonth()]} – ${end.getDate()} ${FRENCH_MONTHS_SHORT[end.getMonth()]} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${FRENCH_MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${FRENCH_MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`;
}

function buildHref(view: CalendarView, anchor: Date): string {
  const iso = toISODate(anchor);
  if (view === "day") return `/schedules?view=day&day=${iso}`;
  if (view === "2week") return `/schedules?view=2week&week=${iso}`;
  return `/schedules?week=${iso}`;
}

export function ScheduleToolbar({
  range,
  today,
  canMutate,
  searchTerm,
  onSearchChange,
  onCreateClick,
  draftCount,
  templates,
  view,
  anchor,
}: Props) {
  const prevHref = buildHref(view, prevAnchor(view, anchor));
  const nextHref = buildHref(view, nextAnchor(view, anchor));
  const todayMid = new Date(today);
  todayMid.setHours(0, 0, 0, 0);
  const currentMonday = mondayOfWeek(today);
  const isAtToday =
    view === "day"
      ? anchor.getTime() === todayMid.getTime()
      : range.start.getTime() === currentMonday.getTime();
  const todayHref = buildHref(view, view === "day" ? todayMid : currentMonday);
  const label = formatRangeLabel(range, view);
  const weekStartISO = toISODate(range.start);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = React.useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = React.useState(false);

  return (
    <>
      <div className="bg-card flex flex-wrap items-center gap-2 rounded-md border p-2 md:p-3">
        {canMutate && (
          <Button onClick={onCreateClick} size="sm">
            <PlusIcon />
            Créer
          </Button>
        )}

        {canMutate && (
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={draftCount === 0}
            onClick={() => setPublishOpen(true)}
          >
            <Send />
            Publier la semaine
            {draftCount > 0 && (
              <span className="ml-1 text-xs opacity-80">({draftCount})</span>
            )}
          </Button>
        )}

        {canMutate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSaveTemplateOpen(true)}
          >
            <Save />
            Sauvegarder
          </Button>
        )}

        {canMutate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setApplyTemplateOpen(true)}
          >
            <LayoutTemplate />
            Appliquer un modèle
          </Button>
        )}

        <div className="relative min-w-[160px] flex-1 sm:max-w-xs">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un employé…"
            className="h-9 pl-8"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          {!isAtToday && (
            <Button asChild variant="ghost" size="sm">
              <Link href={todayHref}>Aujourd&apos;hui</Link>
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            size="icon"
            aria-label="Précédent"
          >
            <Link href={prevHref}>
              <ChevronLeftIcon />
            </Link>
          </Button>
          <span className="px-2 text-sm font-medium tabular-nums">{label}</span>
          <Button
            asChild
            variant="outline"
            size="icon"
            aria-label="Suivant"
          >
            <Link href={nextHref}>
              <ChevronRightIcon />
            </Link>
          </Button>
          <ViewSelect view={view} anchor={anchor} />
        </div>
      </div>

      {publishOpen && (
        <PublishWeekDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setPublishOpen(false);
          }}
          draftCount={draftCount}
          weekStartISO={weekStartISO}
          weekLabel={label}
        />
      )}

      {saveTemplateOpen && (
        <SaveTemplateDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setSaveTemplateOpen(false);
          }}
          weekStartISO={weekStartISO}
          weekLabel={label}
        />
      )}

      {applyTemplateOpen && (
        <ApplyTemplateDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setApplyTemplateOpen(false);
          }}
          weekStartISO={weekStartISO}
          weekLabel={label}
          templates={templates}
        />
      )}
    </>
  );
}

function ViewSelect({
  view,
  anchor,
}: {
  view: CalendarView;
  anchor: Date;
}) {
  const router = useRouter();
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as CalendarView;
    router.push(buildHref(next, anchor));
  };
  return (
    <select
      value={view}
      onChange={onChange}
      aria-label="Vue"
      className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-xs"
    >
      <option value="week">Semaine</option>
      <option value="day">Jour</option>
      <option value="2week">2 semaines</option>
    </select>
  );
}
