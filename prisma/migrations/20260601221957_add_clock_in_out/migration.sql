-- CreateEnum
CREATE TYPE "PunchType" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "PunchLocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PunchLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Punch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "locationId" TEXT,
    "type" "PunchType" NOT NULL,
    "punchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Punch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PunchLocation_token_key" ON "PunchLocation"("token");

-- CreateIndex
CREATE INDEX "PunchLocation_companyId_idx" ON "PunchLocation"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PunchLocation_companyId_name_key" ON "PunchLocation"("companyId", "name");

-- CreateIndex
CREATE INDEX "Punch_companyId_punchedAt_idx" ON "Punch"("companyId", "punchedAt" DESC);

-- CreateIndex
CREATE INDEX "Punch_employeeId_punchedAt_idx" ON "Punch"("employeeId", "punchedAt" DESC);

-- AddForeignKey
ALTER TABLE "PunchLocation" ADD CONSTRAINT "PunchLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punch" ADD CONSTRAINT "Punch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punch" ADD CONSTRAINT "Punch_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punch" ADD CONSTRAINT "Punch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "PunchLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
