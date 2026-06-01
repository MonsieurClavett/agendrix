-- CreateEnum
CREATE TYPE "ShiftChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED_BY_EMPLOYEE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SHIFT_CHANGE_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'SHIFT_CHANGE_DECIDED';

-- CreateTable
CREATE TABLE "ShiftChangeRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "requestedStartsAt" TIMESTAMP(3) NOT NULL,
    "requestedEndsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "ShiftChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "managerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftChangeRequest_companyId_status_idx" ON "ShiftChangeRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "ShiftChangeRequest_employeeId_status_idx" ON "ShiftChangeRequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX "ShiftChangeRequest_shiftId_idx" ON "ShiftChangeRequest"("shiftId");

-- AddForeignKey
ALTER TABLE "ShiftChangeRequest" ADD CONSTRAINT "ShiftChangeRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftChangeRequest" ADD CONSTRAINT "ShiftChangeRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftChangeRequest" ADD CONSTRAINT "ShiftChangeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftChangeRequest" ADD CONSTRAINT "ShiftChangeRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Phase 25: one PENDING request at a time per shift.
CREATE UNIQUE INDEX "ShiftChangeRequest_shiftId_pending_unique"
  ON "ShiftChangeRequest"("shiftId")
  WHERE "status" = 'PENDING';
