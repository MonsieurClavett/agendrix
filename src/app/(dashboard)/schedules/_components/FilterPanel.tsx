"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TOOLTIP_HINT = "Bientôt disponible — phase 5+";

const POSITIONS = ["Bar", "Cuisine", "Service", "Runner"];
const DISPLAY_TOGGLES = [
  "Masquer les quarts en arrière-plan",
  "Masquer les quarts à combler",
  "Grouper par position",
];

export function FilterPanel() {
  return (
    <aside className="bg-card hidden h-fit w-60 shrink-0 rounded-md border p-4 lg:block">
      <SectionHeader>Gérer par</SectionHeader>
      <div className="bg-muted/40 mt-2 flex gap-1 rounded-md p-1">
        <Button
          size="sm"
          className="flex-1"
          aria-pressed="true"
        >
          Employé
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="flex-1">
              <Button
                size="sm"
                variant="ghost"
                className="w-full"
                disabled
                aria-disabled="true"
              >
                Position
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{TOOLTIP_HINT}</TooltipContent>
        </Tooltip>
      </div>

      <Separator className="my-5" />

      <SectionHeader>Filtres / Positions</SectionHeader>
      <ul className="mt-2 space-y-1.5">
        {POSITIONS.map((p) => (
          <DisabledCheckbox key={p} label={p} />
        ))}
      </ul>
      <p className="text-muted-foreground mt-2 text-[11px]">
        {TOOLTIP_HINT}
      </p>

      <Separator className="my-5" />

      <SectionHeader>Affichage</SectionHeader>
      <ul className="mt-2 space-y-1.5">
        {DISPLAY_TOGGLES.map((t) => (
          <DisabledCheckbox key={t} label={t} />
        ))}
      </ul>
      <p className="text-muted-foreground mt-2 text-[11px]">
        {TOOLTIP_HINT}
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
            <label className="text-muted-foreground flex cursor-not-allowed items-center gap-2 text-sm opacity-70">
              <input
                type="checkbox"
                disabled
                className="border-input size-4 rounded border"
              />
              {label}
            </label>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">{TOOLTIP_HINT}</TooltipContent>
      </Tooltip>
    </li>
  );
}
