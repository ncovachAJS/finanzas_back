-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "seriesId" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "seriesId" TEXT;

-- CreateIndex
CREATE INDEX "Income_seriesId_idx" ON "Income"("seriesId");

-- CreateIndex
CREATE INDEX "Expense_seriesId_idx" ON "Expense"("seriesId");

