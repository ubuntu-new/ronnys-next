-- CreateTable
CREATE TABLE "ConsumptionRule" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "sizeKey" TEXT,
    "productId" TEXT,
    "toppingId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumptionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsumptionRule_productId_idx" ON "ConsumptionRule"("productId");

-- CreateIndex
CREATE INDEX "ConsumptionRule_toppingId_idx" ON "ConsumptionRule"("toppingId");

-- CreateIndex
CREATE INDEX "ConsumptionRule_itemId_idx" ON "ConsumptionRule"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumptionRule_productId_toppingId_itemId_sizeKey_key" ON "ConsumptionRule"("productId", "toppingId", "itemId", "sizeKey");

-- AddForeignKey
ALTER TABLE "ConsumptionRule" ADD CONSTRAINT "ConsumptionRule_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumptionRule" ADD CONSTRAINT "ConsumptionRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumptionRule" ADD CONSTRAINT "ConsumptionRule_toppingId_fkey" FOREIGN KEY ("toppingId") REFERENCES "Topping"("id") ON DELETE CASCADE ON UPDATE CASCADE;
