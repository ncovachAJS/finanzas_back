-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('FIXED', 'VARIABLE', 'DEBT', 'DONATION', 'INVESTMENT', 'OTHER');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "expenseType" "ExpenseType" NOT NULL DEFAULT 'VARIABLE';
