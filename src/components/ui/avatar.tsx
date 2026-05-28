import * as React from "react";

import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/avatar";

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
};

type Props = {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Avatar({ name, size = "md", className }: Props) {
  const initials = getInitials(name);
  const { bg, fg } = getAvatarColor(name ?? "");
  return (
    <div
      data-slot="avatar"
      aria-label={name ?? undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase tracking-wide select-none",
        SIZE_CLASSES[size],
        className,
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      {initials}
    </div>
  );
}
