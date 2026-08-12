// scripts/add-branch-combo.mjs
//
// კომბოს ხელმისაწვდომობა ფილიალებში — `BranchCombo`, ზუსტად `BranchProduct`-ის
// ანალოგიით. ძველი `Combo.disabledBranches` მასივი უგამოყენებელი დარჩა:
// admin-ში ჩექბოქსები ჩანდა, საიტი კი მათ არ კითხულობდა.
//
// ჩანაწერის არარსებობა = ხელმისაწვდომია.
//
// ორჯერ გაშვება უსაფრთხოა.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "prisma/schema.prisma";
if (!existsSync(F)) {
  console.error(`ვერ ვიპოვე ${F} — გაუშვი repo-ს root-იდან.`);
  process.exit(1);
}

let s = readFileSync(F, "utf8");

if (s.includes("model BranchCombo")) {
  console.log("უკვე დამატებულია — არაფერი შევცვალე.");
  process.exit(0);
}

copyFileSync(F, F + ".bak");

function addRelation(text, model, line) {
  const start = text.indexOf(`model ${model} {`);
  if (start === -1) throw new Error(`ვერ ვიპოვე model ${model}`);
  const end = text.indexOf("\n}", start);
  let block = text.slice(start, end);
  if (block.includes(line.trim())) return text;
  const idx = block.indexOf("\n  @@");
  block = idx !== -1 ? block.slice(0, idx + 1) + line + block.slice(idx + 1) : block + "\n" + line;
  return text.slice(0, start) + block + text.slice(end);
}

s = addRelation(s, "Branch", "  branchCombos BranchCombo[]\n\n");
s = addRelation(s, "Combo", "  branchCombos BranchCombo[]\n\n");

s += `

/// კომბოს მდგომარეობა კონკრეტულ ფილიალში.
/// ჩანაწერის არარსებობა = ხელმისაწვდომია (ნაგულისხმევი) — იგივე წესი, რაც BranchProduct-ში.
model BranchCombo {
  id       String @id @default(cuid())
  branchId String
  comboId  String

  /// false = ამ ფილიალში დროებით არ იყიდება
  available Boolean @default(true)

  note      String?
  updatedAt DateTime @updatedAt
  updatedBy String?

  branch Branch @relation(fields: [branchId], references: [id], onDelete: Cascade)
  combo  Combo  @relation(fields: [comboId], references: [id], onDelete: Cascade)

  @@unique([branchId, comboId])
  @@index([comboId, available])
  @@index([branchId, available])
}
`;

writeFileSync(F, s);
console.log("✓ BranchCombo");
console.log(`  backup: ${F}.bak`);
console.log("\nშემდეგი: npx prisma migrate dev --name branch_combo");
