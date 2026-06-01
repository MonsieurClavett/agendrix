import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type Badge = {
  id: string;
  label: string;
  tone: "primary" | "amber" | "emerald";
};

const TONE_CLASS: Record<Badge["tone"], string> = {
  primary:
    "border-primary/30 bg-primary/5 text-primary",
  amber:
    "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400",
  emerald:
    "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
};

export function BadgesGrid({ badges }: { badges: Badge[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {badges.map((b) => (
        <div
          key={b.id}
          className={cn(
            "lift-on-hover flex items-center gap-2 rounded-xl border p-3 text-sm font-medium",
            TONE_CLASS[b.tone],
          )}
        >
          <Sparkles className="size-4 shrink-0" />
          <span className="truncate">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
