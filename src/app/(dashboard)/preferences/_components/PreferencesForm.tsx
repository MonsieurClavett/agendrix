"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  savePreferencesAction,
  type SavePreferencesState,
} from "@/actions/preferences/save";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Initial = {
  minHoursPerWeek: number | null;
  maxHoursPerWeek: number | null;
  preferredDays: number[];
  notes: string;
};

const DAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 7, label: "Dim" },
];

const initial: SavePreferencesState = {};

export function PreferencesForm({ initial: data }: { initial: Initial }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    savePreferencesAction,
    initial,
  );

  const [selectedDays, setSelectedDays] = React.useState<Set<number>>(
    () => new Set(data.preferredDays),
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Préférences enregistrées.");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, router]);

  const toggleDay = (d: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  return (
    <form action={formAction} className="bg-card max-w-2xl rounded-xl border p-6 space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Heures souhaitées par semaine</h2>
          <p className="text-muted-foreground text-xs">
            Indicatif — votre gestionnaire essaiera de respecter cette plage.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="minHoursPerWeek">Minimum (h)</Label>
            <Input
              id="minHoursPerWeek"
              name="minHoursPerWeek"
              type="number"
              min={0}
              max={168}
              step={1}
              defaultValue={data.minHoursPerWeek ?? ""}
              placeholder="Ex. 20"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxHoursPerWeek">Maximum (h)</Label>
            <Input
              id="maxHoursPerWeek"
              name="maxHoursPerWeek"
              type="number"
              min={0}
              max={168}
              step={1}
              defaultValue={data.maxHoursPerWeek ?? ""}
              placeholder="Ex. 35"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Jours préférés</h2>
          <p className="text-muted-foreground text-xs">
            Sélectionnez les jours où vous préférez travailler.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => {
            const active = selectedDays.has(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={cn(
                  "inline-flex h-9 min-w-12 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        {Array.from(selectedDays).map((d) => (
          <input
            key={d}
            type="hidden"
            name="preferredDays"
            value={String(d)}
          />
        ))}
      </section>

      <section className="space-y-3">
        <div>
          <Label htmlFor="notes" className="text-sm font-semibold">
            Notes libres
          </Label>
          <p className="text-muted-foreground text-xs">
            Contraintes particulières, préférences d&apos;équipe, etc. (max 500
            caractères)
          </p>
        </div>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={500}
          defaultValue={data.notes}
          placeholder="Ex. Pas de fermeture, j'ai un transport limité après 22h."
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
        />
      </section>

      <div className="flex justify-end border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
