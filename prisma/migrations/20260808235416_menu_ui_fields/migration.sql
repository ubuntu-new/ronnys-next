/*
  Warnings:

  - A unique constraint covering the columns `[legacyId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "builder" TEXT,
ADD COLUMN     "emoji" TEXT,
ADD COLUMN     "isBYO" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "legacyId" INTEGER;

-- AlterTable
ALTER TABLE "Topping" ADD COLUMN     "dots" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "emoji" TEXT,
ADD COLUMN     "popular" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Product_legacyId_key" ON "Product"("legacyId");
