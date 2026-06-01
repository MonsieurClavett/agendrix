-- CreateTable
CREATE TABLE "EmployeePreference" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "minHoursPerWeek" INTEGER,
    "maxHoursPerWeek" INTEGER,
    "preferredDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePreference_employeeId_key" ON "EmployeePreference"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeePreference_companyId_idx" ON "EmployeePreference"("companyId");

-- AddForeignKey
ALTER TABLE "EmployeePreference" ADD CONSTRAINT "EmployeePreference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePreference" ADD CONSTRAINT "EmployeePreference_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
