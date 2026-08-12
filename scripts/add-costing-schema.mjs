// scripts/add-costing-schema.mjs
//
// თვითღირებულება — მოძრავი საშუალო.
//
// რატომ საშუალო და არა FIFO: FIFO პარტიების თვალყურის დევნებას მოითხოვს
// (რომელი კილო რომელი მიღებიდანაა). რესტორანში, სადაც მოცარელა ერთ ყუთშია
// შერეული, ეს ფიქცია იქნებოდა. საშუალო ერთი რიცხვია და ჟურნალიდან გამომდინარეობს.
//
// ფორმულა მიღებისას:
//   ახალი საშუალო = (ძველი ნაშთი × ძველი საშუალო + შემოსული × შემოსვლის ფასი)
//                   ÷ (ძველი ნაშთი + შემოსული)
//
// ⚠️ წარსული მიღებები ფასის გარეშეა — თვითღირებულება ამ მომენტიდან იწყებს დათვლას.
//
// ორჯერ გაშვება უსაფრთხოა.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "prisma/schema.prisma";
if (!existsSync(F)) {
  console.error(`ვერ ვიპოვე ${F} — გაუშვი repo-ს root-იდან.`);
  process.exit(1);
}

let s = readFileSync(F, "utf8");

if (s.includes("unitCost")) {
  console.log("უკვე დამატებულია — არაფერი შევცვალე.");
  process.exit(0);
}

copyFileSync(F, F + ".bak");

function addFields(text, model, anchor, fields) {
  const start = text.indexOf(`model ${model} {`);
  if (start === -1) throw new Error(`ვერ ვიპოვე model ${model}`);
  const end = text.indexOf("\n}", start);
  let block = text.slice(start, end);
  const idx = block.indexOf(anchor);
  if (idx === -1) throw new Error(`ვერ ვიპოვე "${anchor}" model ${model}-ში`);
  block = block.slice(0, idx) + fields + block.slice(idx);
  return text.slice(0, start) + block + text.slice(end);
}

// ── StockMovement: ერთეულის ფასი ამ მოძრაობაზე ──
s = addFields(
  s,
  "StockMovement",
  "  refType String?",
  `  /// ერთეულის ფასი ამ მოძრაობაზე (მიღებისას — შესყიდვის, ჩამოწერისას — მიმდინარე საშუალო)
  unitCost Decimal? @db.Decimal(14, 4)
  /// qty × unitCost — რამდენად შეიცვალა მარაგის ღირებულება
  totalCost Decimal? @db.Decimal(14, 2)

`,
);

// ── StockLevel: მიმდინარე საშუალო ──
s = addFields(
  s,
  "StockLevel",
  "  updatedAt DateTime @updatedAt",
  `  /// მოძრავი საშუალო ღირებულება ერთეულზე
  avgCost Decimal? @db.Decimal(14, 4)

`,
);

writeFileSync(F, s);
console.log("✓ StockMovement.unitCost / totalCost");
console.log("✓ StockLevel.avgCost");
console.log(`  backup: ${F}.bak`);
console.log("\nშემდეგი: npx prisma migrate dev --name costing");
