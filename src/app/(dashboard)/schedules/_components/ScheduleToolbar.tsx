"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addDays,
  mondayOfWeek,
  toISODate,
  type WeekRange,
} from "@/lib/week";
import { PublishWeekDialog } from "./PublishWeekDialog";

type Props = {
  range: WeekRange;
  today: Date;
  canMutate: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onCreateClick: () => void;
  draftCount: number;
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

function formatRangeLabel(range: WeekRange): string {
  const start = range.start;
  const end = addDays(range.start, 6);
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

export function ScheduleToolbar({
  range,
  today,
  canMutate,
  searchTerm,
  onSearchChange,
  onCreateClick,
  draftCount,
}: Props) {
  const prev = toISODate(addDays(range.start, -7));
  const next = toISODate(addDays(range.start, 7));
  const currentMonday = mondayOfWeek(today);
  const isCurrentWeek = range.start.getTime() === currentMonday.getTime();
  const label = formatRangeLabel(range);
  const weekStartISO = toISODate(range.start);
  const [publishOpen, setPublishOpen] = React.useState(false);

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
          {!isCurrentWeek && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/schedules">Aujourd&apos;hui</Link>
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            size="icon"
            aria-label="Semaine précédente"
          >
            <Link href={`/schedules?week=${prev}`}>
              <ChevronLeftIcon />
            </Link>
          </Button>
          <span className="px-2 text-sm font-medium tabular-nums">{label}</span>
          <Button
            asChild
            variant="outline"
            size="icon"
            aria-label="Semaine suivante"
          >
            <Link href={`/schedules?week=${next}`}>
              <ChevronRightIcon />
            </Link>
          </Button>
          <select
            defaultValue="week"
            aria-label="Vue"
            className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-xs"
          >
            <option value="week">Semaine</option>
          </select>
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
    </>
  );
}
