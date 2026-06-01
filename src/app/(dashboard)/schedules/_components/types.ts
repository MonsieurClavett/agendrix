import type { Role, ShiftStatus } from "@/generated/prisma";

export type WeekShift = {
  id: string;
  employeeId: string;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  positionId: string | null;
  status: ShiftStatus;
  employee: { id: string; name: string | null; isActive: boolean };
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
