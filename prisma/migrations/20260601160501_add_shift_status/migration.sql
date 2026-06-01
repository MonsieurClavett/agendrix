-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "status" "ShiftStatus" NOT NULL DEFAULT 'DRAFT';

-- Backfill: every pre-Phase-8 shift was already visible to its
-- employee, so mark existing rows as PUBLISHED. New rows continue
-- to default to DRAFT.
UPDATE "Shift" SET "status" = 'PUBLISHED';

-- CreateIndex
CREATE INDEX "Shift_companyId_status_idx" ON "Shift"("companyId", "status");
