-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Discount_deletedAt_idx" ON "Discount"("deletedAt");

-- CreateIndex
CREATE INDEX "Employee_deletedAt_idx" ON "Employee"("deletedAt");
