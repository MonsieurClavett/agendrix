-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ANNOUNCEMENT_POSTED';

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_companyId_isPinned_createdAt_idx" ON "Announcement"("companyId", "isPinned", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
