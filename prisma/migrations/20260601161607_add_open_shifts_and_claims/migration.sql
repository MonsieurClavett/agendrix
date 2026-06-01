-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Shift" ALTER COLUMN "employeeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ShiftClaim" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftClaim_companyId_status_idx" ON "ShiftClaim"("companyId", "status");

-- CreateIndex
CREATE INDEX "ShiftClaim_shiftId_idx" ON "ShiftClaim"("shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftClaim_shiftId_employeeId_key" ON "ShiftClaim"("shiftId", "employeeId");

-- AddForeignKey
ALTER TABLE "ShiftClaim" ADD CONSTRAINT "ShiftClaim_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftClaim" ADD CONSTRAINT "ShiftClaim_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftClaim" ADD CONSTRAINT "ShiftClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftClaim" ADD CONSTRAINT "ShiftClaim_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
