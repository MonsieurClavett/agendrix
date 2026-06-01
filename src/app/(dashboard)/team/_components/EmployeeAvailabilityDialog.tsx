"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AvailabilityRow } from "@/lib/repositories/availability";
import { AvailabilityWeekView } from "@/app/(dashboard)/disponibilites/_components/AvailabilityWeekView";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: { id: string; name: string | null };
  ranges: AvailabilityRow[];
  canEdit: boolean;
};

export function EmployeeAvailabilityDialog({
  open,
  onOpenChange,
  employee,
  ranges,
  canEdit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Disponibilités de {employee.name ?? "(sans nom)"}
          </DialogTitle>
        </DialogHeader>
        <AvailabilityWeekView
          ranges={ranges}
          targetEmployeeId={employee.id}
          canEdit={canEdit}
        />
      </DialogContent>
    </Dialog>
  );
}
