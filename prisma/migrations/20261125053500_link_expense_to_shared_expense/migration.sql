-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "sharedExpenseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Expense_sharedExpenseId_key" ON "Expense"("sharedExpenseId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_sharedExpenseId_fkey" FOREIGN KEY ("sharedExpenseId") REFERENCES "SharedExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
