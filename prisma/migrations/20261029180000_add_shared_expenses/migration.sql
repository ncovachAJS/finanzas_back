-- AlterTable
ALTER TABLE "User" ADD COLUMN     "partnerId" TEXT;

-- CreateTable
CREATE TABLE "SharedExpense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidByUserId" TEXT NOT NULL,
    "owedByUserId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "note" TEXT,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SharedExpense_paidByUserId_idx" ON "SharedExpense"("paidByUserId");

-- CreateIndex
CREATE INDEX "SharedExpense_owedByUserId_idx" ON "SharedExpense"("owedByUserId");

-- CreateIndex
CREATE INDEX "Settlement_fromUserId_idx" ON "Settlement"("fromUserId");

-- CreateIndex
CREATE INDEX "Settlement_toUserId_idx" ON "Settlement"("toUserId");

