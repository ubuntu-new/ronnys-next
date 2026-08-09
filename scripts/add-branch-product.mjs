// scripts/add-branch-product.mjs
//
// ამატებს `BranchProduct`-ს — პროდუქტის მდგომარეობა კონკრეტულ ფილიალში.
// `min`/`target`/`stock` განზრახ ახლავე ჩავდე, რომ მარაგის ეტაპზე
// ცხრილის გადაკეთება არ დაგვჭირდეს.
//
// ორჯერ გაშვება უსაფრთხოა.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "prisma/schema.prisma";
if (!existsSync(F)) {
  console.error(`ვერ ვიპოვე ${F} — გაუშვი repo-ს root-იდან.`);
  process.exit(1);
}

let s = readFileSync(F, "utf8");

if (s.includes("model BranchProduct")) {
  console.log("უკვე დამატებულია — არაფერი შევცვალე.");
  process.exit(0);
}

copyFileSync(F, F + ".bak");

// ── 1) კავშირები Branch-სა და Product-ზე ──
function addRelation(text, model, line) {
  const start = text.indexOf(`model ${model} {`);
  if (start === -1) throw new Error(`ვერ ვიპოვე model ${model}`);
  const end = text.indexOf("\n}", start);
  let block = text.slice(start, end);
  if (block.includes(line.trim())) return text;

  const idx = block.indexOf("\n  @@");
  block = idx !== -1
    ? block.slice(0, idx + 1) + line + block.slice(idx + 1)
    : block.replace(/\s*$/, "\n" + line);

  return text.slice(0, start) + block + text.slice(end);
}

s = addRelation(s, "Branch", "  branchProducts BranchProduct[]\n\n");
s = addRelation(s, "Product", "  branchProducts BranchProduct[]\n\n");

// ── 2) ცხრილი ──
s += `

/// პროდუქტის მდგომარეობა კონკრეტულ ფილიალში.
/// ჩანაწერის არარსებობა = ხელმისაწვდომია (ნაგულისხმევი).
/// stock/min/target მარაგის ეტაპისთვისაა — ახლა null-ია.
model BranchProduct {
  id        String @id @default(cuid())
  branchId  String
  productId String

  /// false = ამ ფილიალში დროებით არ იყიდება („გათავდა“)
  available Boolean @default(true)

  /// ცალობითი ნაშთი. null = ამ პროდუქტს რაოდენობით არ ვითვლით (მაგ. პიცა)
  stock       Int?
  /// ამ ზღვარზე ჩამოსვლა შევსების სიგნალია
  minLevel    Int?
  /// რამდენამდე უნდა შეივსოს
  targetLevel Int?

  note      String?
  updatedAt DateTime @updatedAt
  updatedBy String?

  branch  Branch  @relation(fields: [branchId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([branchId, productId])
  @@index([productId, available])
  @@index([branchId, available])
}
`;

writeFileSync(F, s);
console.log("✓ BranchProduct დაემატა");
console.log("✓ კავშირები: Branch, Product");
console.log(`  backup: ${F}.bak`);
console.log("\nშემდეგი: npx prisma migrate dev --name branch_product");
