"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getPositionColor } from "@/lib/positions";
import type { PositionOption } from "./types";

const TOOLTIP_DEFERRED = "Bientôt disponible";

const DISPLAY_TOGGLES = [
  "Masquer les quarts en arrière-plan",
  "Masquer les quarts à combler",
  "Grouper par position",
];

type Props = {
  positions: PositionOption[];
  selectedPositionIds: Set<string>;
  includeNoneFilter: boolean;
  groupBy: "employee" | "position";
  onTogglePosition: (id: string) => void;
  onToggleNone: () => void;
  onChangeGroupBy: (mode: "employee" | "position") => void;
  onClearFilters: () => void;
};

export function FilterPanel({
  positions,
  selectedPositionIds,
  includeNoneFilter,
  groupBy,
  onTogglePosition,
  onToggleNone,
  onChangeGroupBy,
  onClearFilters,
}: Props) {
  const anyFilterActive =
    selectedPositionIds.size > 0 || includeNoneFilter;

  return (
    <aside className="bg-card hidden h-fit w-60 shrink-0 rounded-md border p-4 lg:block">
      <SectionHeader>Gérer par</SectionHeader>
      <div className="bg-muted/40 mt-2 flex gap-1 rounded-md p-1">
        <Button
          size="sm"
          variant={groupBy === "employee" ? "default" : "ghost"}
          className="flex-1"
          onClick={() => onChangeGroupBy("employee")}
        >
          Employé
        </Button>
        <Button
          size="sm"
          variant={groupBy === "position" ? "default" : "ghost"}
          className="flex-1"
          onClick={() => onChangeGroupBy("position")}
        >
          Position
        </Button>
      </div>

      <Separator className="my-5" />

      <div className="flex items-center justify-between">
        <SectionHeader>Filtres / Positions</SectionHeader>
        {anyFilterActive && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={onClearFilters}
          >
            Effacer
          </Button>
        )}
      </div>
      <ul className="mt-2 space-y-1.5">
        {positions.length === 0 ? (
          <li className="text-muted-foreground text-xs italic">
            Aucune position. Créez-en sur la page Positions.
          </li>
        ) : (
          positions.map((p) => {
            const palette = getPositionColor(p.color);
            const checked = selectedPositionIds.has(p.id);
            return (
              <li key={p.id}>
                <label className="hover:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onTogglePosition(p.id)}
                    className="border-input size-4 rounded border"
                  />
                  <span
                    className="border-border size-3 shrink-0 rounded-full border"
                    style={{ backgroundColor: palette.swatch }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{p.name}</span>
                </label>
              </li>
            );
          })
        )}
        <li>
          <label className="hover:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm">
            <input
              type="checkbox"
              checked={includeNoneFilter}
              onChange={onToggleNone}
              className="border-input size-4 rounded border"
            />
            <span
              className="border-border size-3 shrink-0 rounded-full border bg-transparent"
              aria-hidden="true"
            />
            <span className="text-muted-foreground italic">Sans position</span>
          </label>
        </li>
      </ul>

      <Separator className="my-5" />

      <SectionHeader>Affichage</SectionHeader>
      <ul className="mt-2 space-y-1.5">
        {DISPLAY_TOGGLES.map((t) => (
          <DisabledCheckbox key={t} label={t} />
        ))}
      </ul>
      <p className="text-muted-foreground mt-2 text-[11px]">
        {TOOLTIP_DEFERRED}
      </p>
    </aside>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-foreground text-xs font-semibold uppercase tracking-wide">
      {children}
    </h3>
  );
}

function DisabledCheckbox({ label }: { label: string }) {
  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="block">
            <label
              className={cn(
                "text-muted-foreground flex cursor-not-allowed items-center gap-2 text-sm opacity-70",
              )}
            >
              <input
                type="checkbox"
                disabled
                className="border-input size-4 rounded border"
              />
              {label}
            </label>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">{TOOLTIP_DEFERRED}</TooltipContent>
      </Tooltip>
    </li>
  );
}
