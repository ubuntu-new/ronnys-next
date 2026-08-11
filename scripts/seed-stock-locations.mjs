// scripts/seed-stock-locations.mjs
//
// ლოკაციები: ცენტრალური საწარმო + თითო ფილიალზე ერთი.
// იდემპოტენტურია — არსებულს არ ცვლის.
//
// გაშვება (მიგრაციის შემდეგ):  npx tsx scripts/seed-stock-locations.mjs

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ── საწარმო ──
let warehouse = await db.stockLocation.findFirst({ where: { type: "warehouse" } });
if (!warehouse) {
  warehouse = await db.stockLocation.create({
    data: {
      id: "loc-warehouse",
      name: { en: "Central warehouse", ka: "ცენტრალური საწარმო" },
      type: "warehouse",
      active: true,
    },
  });
  console.log("✓ საწარმო შეიქმნა");
} else {
  console.log("საწარმო უკვე არსებობს");
}

// ── ფილიალები ──
const branches = await db.branch.findMany({ where: { deletedAt: null } });
let made = 0;

for (const b of branches) {
  const exists = await db.stockLocation.findUnique({ where: { branchId: b.id } });
  if (exists) continue;

  await db.stockLocation.create({
    data: {
      id: `loc-${b.id}`,
      name: b.name,
      type: "branch",
      branchId: b.id,
      active: b.active,
    },
  });
  made++;
}

console.log(`✓ ${made} ფილიალის ლოკაცია შეიქმნა (სულ ${branches.length})`);

const total = await db.stockLocation.count({ where: { deletedAt: null } });
console.log(`\nლოკაციები ბაზაში: ${total}`);

await db.$disconnect();
