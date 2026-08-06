-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "budget" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "notes" TEXT;
