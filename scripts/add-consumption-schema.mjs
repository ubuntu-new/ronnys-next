// scripts/add-consumption-schema.mjs
//
// „რა იხარჯება, როცა ეს იყიდება" — მენიუსა და საწყობს შორის ხიდი.
//
// ერთი ცხრილი, ორი მფლობელით (როგორც DiscountRule-ში):
//   productId → პროდუქტის ბაზა (ცომი, სოუსი, ყუთი, ან თავად კოკა-კოლა)
//   toppingId → ტოპინგის ხარჯი (მოცარელა 0.18 კგ)
//
// `sizeKey` ცარიელი = ყველა ზომაზე ერთი და იგივე.
//
// ორჯერ გაშვება უსაფრთხოა.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "prisma/schema.prisma";
if (!existsSync(F)) {
  console.error(`ვერ ვიპოვე ${F} — გაუშვი repo-ს root-იდან.`);
  process.exit(1);
}

let s = readFileSync(F, "utf8");

if (s.includes("model ConsumptionRule")) {
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

s = addRelation(s, "Product", "  consumption ConsumptionRule[]\n\n");
s = addRelation(s, "Topping", "  consumption ConsumptionRule[]\n\n");
s = addRelation(s, "StockItem", "  consumption ConsumptionRule[]\n\n");

s += `

/// რა იხარჯება საწყობიდან, როცა მენიუს პოზიცია იყიდება.
///
/// მფლობელი ერთია — ან პროდუქტი, ან ტოპინგი:
///   productId → ბაზა (ცომი, სოუსი, ყუთი; ან თავად კოკა-კოლა 1 ცალი)
///   toppingId → ტოპინგის ხარჯი (მოცარელა 0.18 კგ)
///
/// qty იმ ერთეულშია, რომელიც StockItem-ს აქვს.
model ConsumptionRule {
  id String @id @default(cuid())

  itemId String
  qty    Decimal @db.Decimal(14, 3)

  /// "S" | "M" | "XL" — ცარიელი ნიშნავს „ყველა ზომაზე"
  sizeKey String?

  productId String?
  toppingId String?

  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  item    StockItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  product Product?  @relation(fields: [productId], references: [id], onDelete: Cascade)
  topping Topping?  @relation(fields: [toppingId], references: [id], onDelete: Cascade)

  @@unique([productId, toppingId, itemId, sizeKey])
  @@index([productId])
  @@index([toppingId])
  @@index([itemId])
}
`;

writeFileSync(F, s);
console.log("✓ ConsumptionRule");
console.log(`  backup: ${F}.bak`);
console.log("\nშემდეგი: npx prisma migrate dev --name consumption_rules");
