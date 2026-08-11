// scripts/add-stock-schema.mjs
//
// საწყობის საფუძველი. მთავარი პრინციპი:
//
//   ნაშთი არასდროს იწერება ხელით — ის მოძრაობების ჯამია.
//   StockLevel.qty მხოლოდ ქეშია, რომელიც იმავე ტრანზაქციაში ახლდება.
//   ამიტომ ყოველთვის შეიძლება კითხვა „რატომ დარჩა 3 კგ?" — პასუხი ჟურნალშია.
//
// ორჯერ გაშვება უსაფრთხოა.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "prisma/schema.prisma";
if (!existsSync(F)) {
  console.error(`ვერ ვიპოვე ${F} — გაუშვი repo-ს root-იდან.`);
  process.exit(1);
}

let s = readFileSync(F, "utf8");

if (s.includes("model StockItem")) {
  console.log("უკვე დამატებულია — არაფერი შევცვალე.");
  process.exit(0);
}

copyFileSync(F, F + ".bak");

// ── Branch-ს კავშირი ──
{
  const start = s.indexOf("model Branch {");
  const end = s.indexOf("\n}", start);
  let block = s.slice(start, end);
  if (!block.includes("stockLocation")) {
    const idx = block.indexOf("\n  @@");
    const line = "  stockLocation StockLocation?\n\n";
    block = idx !== -1 ? block.slice(0, idx + 1) + line + block.slice(idx + 1) : block + "\n" + line;
    s = s.slice(0, start) + block + s.slice(end);
  }
}

s += `

// ═══════════════════════════════════════════════
// საწყობი — ეტაპი 3A
// ═══════════════════════════════════════════════

enum StockLocationType {
  warehouse /// ცენტრალური საწარმო
  branch    /// ფილიალის სამზარეულო
}

enum StockUnit {
  g
  kg
  ml
  l
  pcs
}

enum StockMoveType {
  receipt        /// მიღება მიმწოდებლისგან
  transfer_out   /// გაცემა სხვა ლოკაციაზე
  transfer_in    /// მიღება სხვა ლოკაციიდან
  production_in  /// წარმოებამ დაამზადა
  production_out /// წარმოებამ დახარჯა
  sale           /// შეკვეთაზე ჩამოწერა
  waste          /// ჩამოწერა (გაფუჭდა, დაიღვარა)
  count_adjust   /// ინვენტარიზაციის სხვაობა
}

/// სად ინახება მარაგი. ფილიალს თითო აქვს, პლუს ცენტრალური საწარმო.
model StockLocation {
  id       String            @id @default(cuid())
  name     Json
  type     StockLocationType
  branchId String?           @unique
  active   Boolean           @default(true)

  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  branch    Branch?         @relation(fields: [branchId], references: [id])
  levels    StockLevel[]
  movements StockMovement[]

  @@index([type, active])
  @@index([deletedAt])
}

/// საწყობის ერთეული — ის, რასაც ინახავ (და არა ის, რასაც ყიდი).
/// მოცარელა კგ-ობით, კოკა-კოლა ცალობით, ფქვილი კგ-ობით.
model StockItem {
  id   String    @id @default(cuid())
  sku  String?   @unique
  name Json
  unit StockUnit

  category String? /// "dairy" | "meat" | "veg" | "packaging" | "drink"

  /// true = საწარმოში მზადდება რეცეპტით (ცომი, სოუსი), არა ყიდულობ
  isProduced Boolean @default(false)

  note   String?
  active Boolean @default(true)

  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  levels    StockLevel[]
  movements StockMovement[]

  @@index([active, category])
  @@index([deletedAt])
}

/// მიმდინარე ნაშთი ლოკაციაზე. \`qty\` მოძრაობების ჯამის ქეშია —
/// იმავე ტრანზაქციაში ახლდება და ნებისმიერ დროს გადაითვლება.
model StockLevel {
  id         String @id @default(cuid())
  locationId String
  itemId     String

  qty Decimal @default(0) @db.Decimal(14, 3)

  /// ამ ზღვარზე ჩამოსვლა შევსების სიგნალია
  minLevel    Decimal? @db.Decimal(14, 3)
  /// რამდენამდე უნდა შეივსოს
  targetLevel Decimal? @db.Decimal(14, 3)

  updatedAt DateTime @updatedAt

  location StockLocation @relation(fields: [locationId], references: [id], onDelete: Cascade)
  item     StockItem     @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@unique([locationId, itemId])
  @@index([itemId])
}

/// ჟურნალი — ყველა მოძრაობა. აქედან გამომდინარეობს ნაშთი.
model StockMovement {
  id         String        @id @default(cuid())
  locationId String
  itemId     String
  type       StockMoveType

  /// + შემოსვლა, − გასვლა
  qty          Decimal  @db.Decimal(14, 3)
  /// ნაშთი ამ მოძრაობის შემდეგ — აუდიტისთვის
  balanceAfter Decimal? @db.Decimal(14, 3)

  /// რამ გამოიწვია: "Order" | "Transfer" | "ProductionOrder" | null (ხელით)
  refType String?
  refId   String?

  note       String?
  employeeId String?
  at         DateTime @default(now())

  location StockLocation @relation(fields: [locationId], references: [id])
  item     StockItem     @relation(fields: [itemId], references: [id])

  @@index([locationId, itemId, at])
  @@index([refType, refId])
  @@index([at])
}
`;

writeFileSync(F, s);
console.log("✓ StockLocation, StockItem, StockLevel, StockMovement");
console.log(`  backup: ${F}.bak`);
console.log("\nშემდეგი: npx prisma migrate dev --name stock_foundation");
