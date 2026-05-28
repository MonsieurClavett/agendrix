"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  canMutate: boolean;
  onAddShift?: () => void;
};

export function EmptyWeekCard({ canMutate, onAddShift }: Props) {
  return (
    <Card className="mx-auto max-w-md py-12">
      <CardContent className="flex flex-col items-center text-center">
        <CalendarSvg className="text-muted-foreground/60 mb-4 size-24" />
        <p className="text-lg font-medium">Aucun shift cette semaine.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {canMutate
            ? "Commencez par ajouter un shift pour votre équipe."
            : "Revenez plus tard ou naviguez vers une autre semaine."}
        </p>
        {canMutate && onAddShift && (
          <Button className="mt-6" onClick={onAddShift}>
            Ajouter un shift
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarSvg({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="8" y="14" width="48" height="42" rx="4" />
      <path d="M8 24h48" />
      <path d="M20 8v10" />
      <path d="M44 8v10" />
      <path d="M20 34h6" />
      <path d="M32 34h6" />
      <path d="M44 34h4" />
      <path d="M20 44h6" />
      <path d="M32 44h6" />
    </svg>
  );
}
