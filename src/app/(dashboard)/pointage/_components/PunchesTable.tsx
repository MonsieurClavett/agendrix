import { LogIn, LogOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PunchTableRow = {
  id: string;
  type: "IN" | "OUT";
  punchedAt: Date;
  employeeName: string;
  locationName: string;
};

function formatHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function PunchesTable({ punches }: { punches: PunchTableRow[] }) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
            <th className="px-3 py-2 font-medium">Heure</th>
            <th className="px-3 py-2 font-medium">Employé</th>
            <th className="px-3 py-2 font-medium">Poste</th>
            <th className="px-3 py-2 font-medium">Type</th>
          </tr>
        </thead>
        <tbody>
          {punches.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2 font-semibold tabular-nums">
                {formatHHMM(p.punchedAt)}
              </td>
              <td className="px-3 py-2 font-medium">{p.employeeName}</td>
              <td className="text-muted-foreground px-3 py-2">
                {p.locationName}
              </td>
              <td className="px-3 py-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1",
                    p.type === "IN"
                      ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                      : "border-rose-500/40 text-rose-700 dark:text-rose-400",
                  )}
                >
                  {p.type === "IN" ? (
                    <LogIn className="size-3" />
                  ) : (
                    <LogOut className="size-3" />
                  )}
                  {p.type === "IN" ? "Entrée" : "Sortie"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
