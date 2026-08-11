-- CreateEnum
CREATE TYPE "StockLocationType" AS ENUM ('warehouse', 'branch');

-- CreateEnum
CREATE TYPE "StockUnit" AS ENUM ('g', 'kg', 'ml', 'l', 'pcs');

-- CreateEnum
CREATE TYPE "StockMoveType" AS ENUM ('receipt', 'transfer_out', 'transfer_in', 'production_in', 'production_out', 'sale', 'waste', 'count_adjust');

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "type" "StockLocationType" NOT NULL,
    "branchId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "sku" TEXT,
    "name" JSONB NOT NULL,
    "unit" "StockUnit" NOT NULL,
    "category" TEXT,
    "isProduced" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLevel" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "minLevel" DECIMAL(14,3),
    "targetLevel" DECIMAL(14,3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "StockMoveType" NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "balanceAfter" DECIMAL(14,3),
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "employeeId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockLocation_branchId_key" ON "StockLocation"("branchId");

-- CreateIndex
CREATE INDEX "StockLocation_type_active_idx" ON "StockLocation"("type", "active");

-- CreateIndex
CREATE INDEX "StockLocation_deletedAt_idx" ON "StockLocation"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_sku_key" ON "StockItem"("sku");

-- CreateIndex
CREATE INDEX "StockItem_active_category_idx" ON "StockItem"("active", "category");

-- CreateIndex
CREATE INDEX "StockItem_deletedAt_idx" ON "StockItem"("deletedAt");

-- CreateIndex
CREATE INDEX "StockLevel_itemId_idx" ON "StockLevel"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "StockLevel_locationId_itemId_key" ON "StockLevel"("locationId", "itemId");

-- CreateIndex
CREATE INDEX "StockMovement_locationId_itemId_at_idx" ON "StockMovement"("locationId", "itemId", "at");

-- CreateIndex
CREATE INDEX "StockMovement_refType_refId_idx" ON "StockMovement"("refType", "refId");

-- CreateIndex
CREATE INDEX "StockMovement_at_idx" ON "StockMovement"("at");

-- AddForeignKey
ALTER TABLE "StockLocation" ADD CONSTRAINT "StockLocation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
