-- AlterTable
ALTER TABLE "SharedExpense" ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "SharedGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SharedGroup_userAId_idx" ON "SharedGroup"("userAId");

-- CreateIndex
CREATE INDEX "SharedGroup_userBId_idx" ON "SharedGroup"("userBId");

-- CreateIndex
CREATE INDEX "SharedExpense_groupId_idx" ON "SharedExpense"("groupId");

-- CreateIndex
CREATE INDEX "Settlement_groupId_idx" ON "Settlement"("groupId");

-- AddForeignKey
ALTER TABLE "SharedExpense" ADD CONSTRAINT "SharedExpense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SharedGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SharedGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

