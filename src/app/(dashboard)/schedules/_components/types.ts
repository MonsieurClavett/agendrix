import type { Role } from "@/generated/prisma";

export type WeekShift = {
  id: string;
  employeeId: string;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  employee: { id: string; name: string | null; isActive: boolean };
};

export type Employee = {
  id: string;
  name: string | null;
  role?: Role;
};
