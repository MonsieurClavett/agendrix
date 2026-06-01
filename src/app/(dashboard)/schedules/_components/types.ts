import type { Role, ShiftStatus } from "@/generated/prisma";

export type WeekShift = {
  id: string;
  employeeId: string | null;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  /**
   * Manager-only internal note (Phase 20). The repository's EMPLOYEE
   * selector does NOT include this field, so it stays undefined client-side
   * for non-managers. The UI only renders it when `canMutate` is true.
   */
  internalNote?: string | null;
  positionId: string | null;
  status: ShiftStatus;
  employee: { id: string; name: string | null; isActive: boolean } | null;
  position: { id: string; name: string; color: string } | null;
};

export type Employee = {
  id: string;
  name: string | null;
  role?: Role;
};

export type PositionOption = {
  id: string;
  name: string;
  color: string;
};
