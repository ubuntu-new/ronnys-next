-- AlterTable
ALTER TABLE "StockLevel" ADD COLUMN     "avgCost" DECIMAL(14,4);

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "totalCost" DECIMAL(14,2),
ADD COLUMN     "unitCost" DECIMAL(14,4);
