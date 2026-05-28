"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PositionDialog } from "./PositionDialog";

type Props = {
  emptyState?: boolean;
};

export function AddPositionTrigger({ emptyState = false }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size={emptyState ? "default" : "default"}
      >
        <PlusIcon />
        Ajouter une position
      </Button>
      <PositionDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
