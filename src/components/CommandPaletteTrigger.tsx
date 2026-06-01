"use client";

import * as React from "react";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { OPEN_COMMAND_PALETTE_EVENT } from "./CommandPalette";

export function CommandPaletteTrigger({ className }: { className?: string }) {
  // Platform detection happens in useEffect to avoid hydration mismatch.
  const [isMac, setIsMac] = React.useState(false);
  React.useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPod|iPad/i.test(navigator.platform));
    }
  }, []);

  const open = () => {
    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
  };

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Ouvrir la recherche"
      className={cn(
        "bg-card hover:bg-accent text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
        className,
      )}
    >
      <SearchIcon className="size-4" />
      <span className="hidden md:inline">Rechercher…</span>
      <span
        className="bg-muted text-muted-foreground hidden rounded border px-1.5 py-0.5 text-[10px] font-medium tabular-nums tracking-wider md:inline"
        aria-hidden="true"
      >
        {isMac ? "⌘K" : "Ctrl K"}
      </span>
    </button>
  );
}
