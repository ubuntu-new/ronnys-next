// scripts/migrate-combo-branches.mjs
//
// ძველი `Combo.disabledBranches` (String[]) → `BranchCombo` ჩანაწერები.
// ორჯერ გაშვება უსაფრთხოა.
//
// გაშვება (მიგრაციის შემდეგ):  npx tsx scripts/migrate-combo-branches.mjs

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const combos = await db.combo.findMany({
  where: { disabledBranches: { isEmpty: false } },
  select: { id: true, name: true, disabledBranches: true },
});

let made = 0;
let skipped = 0;

for (const c of combos) {
  for (const branchId of c.disabledBranches) {
    const branch = await db.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      console.warn(`  ⚠ ფილიალი ვერ მოიძებნა: ${branchId}`);
      continue;
    }
    const exists = await db.branchCombo.findUnique({
      where: { branchId_comboId: { branchId, comboId: c.id } },
    });
    if (exists) {
      skipped++;
      continue;
    }
    await db.branchCombo.create({
      data: { branchId, comboId: c.id, available: false, updatedBy: "migration" },
    });
    made++;
  }
}

console.log(`✓ ${combos.length} კომბოს ჰქონდა გამორთული ფილიალები`);
console.log(`  შეიქმნა   ${made}`);
console.log(`  არსებობდა ${skipped}`);

await db.$disconnect();
