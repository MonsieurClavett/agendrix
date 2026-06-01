-- CreateEnum
CREATE TYPE "TimesheetApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TIMESHEET_DECIDED';

-- CreateTable
CREATE TABLE "TimesheetApproval" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "TimesheetApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledMinutesSnapshot" INTEGER NOT NULL,
    "workedMinutesSnapshot" INTEGER NOT NULL,
    "varianceMinutesSnapshot" INTEGER NOT NULL,
    "managerNote" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimesheetApproval_companyId_weekStart_status_idx" ON "TimesheetApproval"("companyId", "weekStart", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetApproval_companyId_weekStart_employeeId_key" ON "TimesheetApproval"("companyId", "weekStart", "employeeId");

-- AddForeignKey
ALTER TABLE "TimesheetApproval" ADD CONSTRAINT "TimesheetApproval_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetApproval" ADD CONSTRAINT "TimesheetApproval_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetApproval" ADD CONSTRAINT "TimesheetApproval_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
