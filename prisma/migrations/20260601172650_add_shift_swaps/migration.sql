-- CreateEnum
CREATE TYPE "SwapStatus" AS ENUM ('PENDING_PEER', 'PENDING_MANAGER', 'APPROVED', 'REJECTED_BY_PEER', 'REJECTED_BY_MANAGER', 'CANCELED_BY_PROPOSER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SWAP_PROPOSED';
ALTER TYPE "NotificationType" ADD VALUE 'SWAP_ACCEPTED_BY_PEER';
ALTER TYPE "NotificationType" ADD VALUE 'SWAP_REJECTED_BY_PEER';
ALTER TYPE "NotificationType" ADD VALUE 'SWAP_DECIDED_BY_MANAGER';

-- CreateTable
CREATE TABLE "ShiftSwap" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "proposerUserId" TEXT NOT NULL,
    "proposerShiftId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "targetShiftId" TEXT NOT NULL,
    "proposerMessage" TEXT,
    "status" "SwapStatus" NOT NULL DEFAULT 'PENDING_PEER',
    "peerDecidedAt" TIMESTAMP(3),
    "peerRejectionReason" TEXT,
    "managerDecidedAt" TIMESTAMP(3),
    "managerDecidedByUserId" TEXT,
    "managerRejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSwap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftSwap_companyId_status_idx" ON "ShiftSwap"("companyId", "status");

-- CreateIndex
CREATE INDEX "ShiftSwap_proposerUserId_status_idx" ON "ShiftSwap"("proposerUserId", "status");

-- CreateIndex
CREATE INDEX "ShiftSwap_targetUserId_status_idx" ON "ShiftSwap"("targetUserId", "status");

-- AddForeignKey
ALTER TABLE "ShiftSwap" ADD CONSTRAINT "ShiftSwap_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwap" ADD CONSTRAINT "ShiftSwap_proposerUserId_fkey" FOREIGN KEY ("proposerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwap" ADD CONSTRAINT "ShiftSwap_proposerShiftId_fkey" FOREIGN KEY ("proposerShiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwap" ADD CONSTRAINT "ShiftSwap_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwap" ADD CONSTRAINT "ShiftSwap_targetShiftId_fkey" FOREIGN KEY ("targetShiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwap" ADD CONSTRAINT "ShiftSwap_managerDecidedByUserId_fkey" FOREIGN KEY ("managerDecidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique indexes: a shift can be engaged in at most one
-- ACTIVE swap at a time. Excluding terminal statuses lets the
-- same shift be reused in a fresh proposition later.
CREATE UNIQUE INDEX "ShiftSwap_proposerShift_active_uniq"
  ON "ShiftSwap"("proposerShiftId")
  WHERE "status" IN ('PENDING_PEER', 'PENDING_MANAGER');

CREATE UNIQUE INDEX "ShiftSwap_targetShift_active_uniq"
  ON "ShiftSwap"("targetShiftId")
  WHERE "status" IN ('PENDING_PEER', 'PENDING_MANAGER');
