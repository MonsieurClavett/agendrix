"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type PreferenceData = {
  minHoursPerWeek: number | null;
  maxHoursPerWeek: number | null;
  preferredDays: number[];
  notes: string | null;
};

type Props = {
  employeeName: string;
  preferences: PreferenceData | null;
};

const DAY_LABELS = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function PreferencesPopover({ employeeName, preferences }: Props) {
  const hasData =
    preferences !== null &&
    (preferences.minHoursPerWeek !== null ||
      preferences.maxHoursPerWeek !== null ||
      preferences.preferredDays.length > 0 ||
      (preferences.notes && preferences.notes.length > 0));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Préférences"
        >
          <SlidersHorizontal className="size-3.5" />
          Préf.
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4 text-sm">
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Préférences
            </h4>
            <p className="font-medium">{employeeName}</p>
          </div>

          {!hasData ? (
            <p className="text-muted-foreground text-xs">
              Aucune préférence déclarée.
            </p>
          ) : (
            <>
              {(preferences!.minHoursPerWeek !== null ||
                preferences!.maxHoursPerWeek !== null) && (
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
                    Heures par semaine
                  </p>
                  <p className="font-medium tabular-nums">
                    {preferences!.minHoursPerWeek ?? "—"}h –{" "}
                    {preferences!.maxHoursPerWeek ?? "—"}h
                  </p>
                </div>
              )}

              {preferences!.preferredDays.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
                    Jours préférés
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {preferences!.preferredDays
                      .slice()
                      .sort((a, b) => a - b)
                      .map((d) => (
                        <span
                          key={d}
                          className="bg-primary/15 text-primary inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium"
                        >
                          {DAY_LABELS[d]}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {preferences!.notes && (
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
                    Notes
                  </p>
                  <p className="text-xs whitespace-pre-wrap">
                    {preferences!.notes}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
