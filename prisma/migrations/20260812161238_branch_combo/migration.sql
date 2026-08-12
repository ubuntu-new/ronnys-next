-- CreateTable
CREATE TABLE "BranchCombo" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "BranchCombo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BranchCombo_comboId_available_idx" ON "BranchCombo"("comboId", "available");

-- CreateIndex
CREATE INDEX "BranchCombo_branchId_available_idx" ON "BranchCombo"("branchId", "available");

-- CreateIndex
CREATE UNIQUE INDEX "BranchCombo_branchId_comboId_key" ON "BranchCombo"("branchId", "comboId");

-- AddForeignKey
ALTER TABLE "BranchCombo" ADD CONSTRAINT "BranchCombo_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchCombo" ADD CONSTRAINT "BranchCombo_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
