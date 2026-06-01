"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, LogOut } from "lucide-react";

import { recordPunchAction, type RecordPunchState } from "@/actions/punches/record";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  token: string;
  nextType: "IN" | "OUT";
};

const initial: RecordPunchState = {};

function formatHHMM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function PunchButton({ token, nextType }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    recordPunchAction,
    initial,
  );

  useEffect(() => {
    if (state.success) {
      const at = formatHHMM(state.success.punchedAt);
      const verb =
        state.success.type === "IN" ? "Entrée pointée" : "Sortie pointée";
      let extra = "";
      if (state.success.variance) {
        const v = state.success.variance;
        if (v.kind === "ON_TIME") extra = " · à l'heure";
        else if (v.kind === "LATE") extra = ` · ${v.minutes} min en retard`;
        else if (v.kind === "EARLY") extra = ` · ${v.minutes} min en avance`;
      }
      toast.success(`${verb} à ${at}${extra}`);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, router]);

  const label = nextType === "IN" ? "Pointer mon entrée" : "Pointer ma sortie";
  const Icon = nextType === "IN" ? LogIn : LogOut;

  return (
    <form action={formAction}>
      <input type="hidden" name="locationToken" value={token} />
      <Button
        type="submit"
        disabled={pending}
        size="lg"
        className={cn(
          "h-14 w-full text-base font-semibold",
          nextType === "IN"
            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
            : "bg-rose-600 hover:bg-rose-700 text-white",
        )}
      >
        <Icon className="size-5" />
        {pending ? "Enregistrement…" : label}
      </Button>
    </form>
  );
}
