// scripts/add-production-schema.mjs
//
// წარმოება: ნედლეული → რეცეპტი → ნახევარფაბრიკატი.
//   ფქვილი 15კგ + წყალი 9ლ + საფუარი 0.2კგ  →  100 ცომის გუნდა
//
// ორი გადაწყვეტილება:
//
// 1. **დაგეგმილი და ფაქტობრივი ცალკე ინახება.** რეცეპტით 100 გუნდა უნდა
//    გამოსულიყო, ფაქტობრივად 88 — სხვაობა (გამოსავალი) ჩანს და არ იკარგება.
//    ნედლეულზეც იგივე: დაგეგმილი 15 კგ, დახარჯული 15.4.
//
// 2. **მოძრაობა მხოლოდ დასრულებისას ხდება.** დაწყებული პარტია ნაშთს არ ცვლის —
//    თორემ შუა პროცესში გაუქმება ჟურნალს დაანაგვიანებდა.
//
// ორჯერ გაშვება უსაფრთხოა.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "prisma/schema.prisma";
if (!existsSync(F)) {
  console.error(`ვერ ვიპოვე ${F} — გაუშვი repo-ს root-იდან.`);
  process.exit(1);
}

let s = readFileSync(F, "utf8");

if (s.includes("model Recipe")) {
  console.log("უკვე დამატებულია — არაფერი შევცვალე.");
  process.exit(0);
}

copyFileSync(F, F + ".bak");

function addRelation(text, model, line) {
  const start = text.indexOf(`model ${model} {`);
  if (start === -1) throw new Error(`ვერ ვიპოვე model ${model}`);
  const end = text.indexOf("\n}", start);
  let block = text.slice(start, end);
  if (block.includes(line.trim().split("\n")[0])) return text;
  const idx = block.indexOf("\n  @@");
  block = idx !== -1 ? block.slice(0, idx + 1) + line + block.slice(idx + 1) : block + "\n" + line;
  return text.slice(0, start) + block + text.slice(end);
}

s = addRelation(
  s,
  "StockItem",
  "  recipeOutputs Recipe[]         @relation(\"RecipeOutput\")\n" +
    "  recipeInputs  RecipeLine[]\n" +
    "  productionLines ProductionLine[]\n\n",
);
s = addRelation(s, "StockLocation", "  productionOrders ProductionOrder[]\n\n");

s += `

/// წარმოების რეცეპტი: შემავალები → გამოსავალი.
/// outputQty არის ერთი გატარების შედეგი (მაგ. 100 გუნდა).
model Recipe {
  id   String @id @default(cuid())
  name Json

  outputItemId String
  outputQty    Decimal @db.Decimal(14, 3)

  note   String?
  active Boolean @default(true)

  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  outputItem StockItem         @relation("RecipeOutput", fields: [outputItemId], references: [id])
  lines      RecipeLine[]
  orders     ProductionOrder[]

  @@index([active])
  @@index([deletedAt])
}

model RecipeLine {
  id       String  @id @default(cuid())
  recipeId String
  itemId   String
  qty      Decimal @db.Decimal(14, 3)
  note     String?

  recipe Recipe    @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  item   StockItem @relation(fields: [itemId], references: [id])

  @@unique([recipeId, itemId])
}

enum ProductionStatus {
  in_progress /// დაწყებულია — მარაგი ჯერ არ შეცვლილა
  done        /// დასრულდა — ნედლეული ჩამოიწერა, პროდუქტი დაემატა
  cancelled
}

/// ერთი პარტია — რეცეპტის N-ჯერ გატარება კონკრეტულ ლოკაციაზე.
model ProductionOrder {
  id String @id @default(cuid())
  no Int    @unique @default(autoincrement())

  recipeId   String
  locationId String

  /// რამდენჯერ ტარდება რეცეპტი (4 × 100 = 400 გუნდა)
  batches    Decimal  @db.Decimal(14, 3)
  /// batches × recipe.outputQty
  plannedQty Decimal  @db.Decimal(14, 3)
  /// ფაქტობრივად რამდენი გამოვიდა
  actualQty  Decimal? @db.Decimal(14, 3)

  status ProductionStatus @default(in_progress)
  note   String?

  startedById   String?
  finishedById  String?
  cancelledById String?

  startedAt   DateTime  @default(now())
  finishedAt  DateTime?
  cancelledAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  recipe   Recipe           @relation(fields: [recipeId], references: [id])
  location StockLocation    @relation(fields: [locationId], references: [id])
  lines    ProductionLine[]

  @@index([status, startedAt])
  @@index([locationId, status])
}

/// ნედლეულის ასლი პარტიის მომენტისთვის — რეცეპტის მერე შეცვლა
/// ძველ პარტიას არ ცვლის.
model ProductionLine {
  id                String @id @default(cuid())
  productionOrderId String
  itemId            String

  qtyPlanned Decimal  @db.Decimal(14, 3)
  qtyUsed    Decimal? @db.Decimal(14, 3)

  order ProductionOrder @relation(fields: [productionOrderId], references: [id], onDelete: Cascade)
  item  StockItem       @relation(fields: [itemId], references: [id])

  @@unique([productionOrderId, itemId])
}
`;

writeFileSync(F, s);
console.log("✓ Recipe, RecipeLine, ProductionOrder, ProductionLine");
console.log(`  backup: ${F}.bak`);
console.log("\nშემდეგი: npx prisma migrate dev --name production");
