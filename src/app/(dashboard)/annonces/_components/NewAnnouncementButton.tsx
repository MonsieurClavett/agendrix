"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnnouncementDialog } from "./AnnouncementDialog";

export function NewAnnouncementButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        Nouvelle annonce
      </Button>
      {open && (
        <AnnouncementDialog
          open
          onOpenChange={(o) => {
            if (!o) setOpen(false);
          }}
          mode="create"
        />
      )}
    </>
  );
}
