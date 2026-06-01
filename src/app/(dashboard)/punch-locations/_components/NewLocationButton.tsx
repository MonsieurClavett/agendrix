"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NewLocationDialog } from "./NewLocationDialog";

export function NewLocationButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        Nouveau poste
      </Button>
      {open && (
        <NewLocationDialog
          open
          onOpenChange={(o) => {
            if (!o) setOpen(false);
          }}
        />
      )}
    </>
  );
}
