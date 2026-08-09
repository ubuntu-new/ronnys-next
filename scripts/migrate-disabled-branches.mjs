// scripts/migrate-disabled-branches.mjs
//
// ძველი `Product.disabledBranches` (String[]) → `BranchProduct` ჩანაწერები.
// ორჯერ გაშვება უსაფრთხოა — არსებულს არ ცვლის.
//
// გაშვება (მიგრაციის შემდეგ):  npx tsx scripts/migrate-disabled-branches.mjs

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const products = await db.product.findMany({
  where: { disabledBranches: { isEmpty: false } },
  select: { id: true, name: true, disabledBranches: true },
});

let made = 0;
let skipped = 0;

for (const p of products) {
  for (const branchId of p.disabledBranches) {
    const branch = await db.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      console.warn(`  ⚠ ფილიალი ვერ მოიძებნა: ${branchId}`);
      continue;
    }
    const exists = await db.branchProduct.findUnique({
      where: { branchId_productId: { branchId, productId: p.id } },
    });
    if (exists) {
      skipped++;
      continue;
    }
    await db.branchProduct.create({
      data: { branchId, productId: p.id, available: false, updatedBy: "migration" },
    });
    made++;
  }
}

console.log(`✓ ${products.length} პროდუქტს ჰქონდა გამორთული ფილიალები`);
console.log(`  შეიქმნა   ${made}`);
console.log(`  არსებობდა ${skipped}`);

await db.$disconnect();
