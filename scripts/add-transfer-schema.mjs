// scripts/add-transfer-schema.mjs
//
// გადატანა ლოკაციებს შორის — ჩვეულებრივ საწარმო → ფილიალი.
//
// ორი გადაწყვეტილება, რომლებიც ღირს ცოდნა:
//
// 1. **გაგზავნილი და მიღებული ცალკე ინახება.** მოძრაობა ორეტაპიანია:
//    გაგზავნისას აკლდება წყაროს, მიღებისას ემატება დანიშნულებას.
//    სხვაობა (დაკარგვა გზაში, არასწორი დათვლა) თვალსაჩინოა და არ იკარგება.
//
// 2. **თითო ეტაპს თავისი პასუხისმგებელი ჰყავს.** ვინ მოითხოვა, ვინ დაამტკიცა,
//    ვინ გააგზავნა, ვინ მიიღო — ცალკე ველებში, არა ერთ „updatedBy"-ში.
//
// ორჯერ გაშვება უსაფრთხოა.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "prisma/schema.prisma";
if (!existsSync(F)) {
  console.error(`ვერ ვიპოვე ${F} — გაუშვი repo-ს root-იდან.`);
  process.exit(1);
}

let s = readFileSync(F, "utf8");

if (s.includes("model Transfer")) {
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
  "StockLocation",
  '  transfersOut Transfer[] @relation("TransferFrom")\n  transfersIn  Transfer[] @relation("TransferTo")\n\n',
);
s = addRelation(s, "StockItem", "  transferLines TransferLine[]\n\n");

s += `

enum TransferStatus {
  draft     /// იწერება
  requested /// ფილიალმა მოითხოვა
  approved  /// საწარმომ დაამტკიცა
  sent      /// გაიგზავნა — წყაროს ჩამოეწერა
  received  /// მიღებულია — დანიშნულებას დაემატა
  cancelled
}

/// გადატანა ლოკაციებს შორის.
model Transfer {
  id String @id @default(cuid())
  no Int    @unique @default(autoincrement())

  fromLocationId String
  toLocationId   String

  status TransferStatus @default(draft)
  note   String?

  /// თითო ეტაპს თავისი პასუხისმგებელი
  requestedById String?
  approvedById  String?
  sentById      String?
  receivedById  String?
  cancelledById String?

  requestedAt DateTime?
  approvedAt  DateTime?
  sentAt      DateTime?
  receivedAt  DateTime?
  cancelledAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  from  StockLocation  @relation("TransferFrom", fields: [fromLocationId], references: [id])
  to    StockLocation  @relation("TransferTo", fields: [toLocationId], references: [id])
  lines TransferLine[]

  @@index([status, createdAt])
  @@index([toLocationId, status])
  @@index([fromLocationId, status])
}

/// მოთხოვნილი / გაგზავნილი / მიღებული — სამივე ცალკე, რომ სხვაობა ჩანდეს.
model TransferLine {
  id         String @id @default(cuid())
  transferId String
  itemId     String

  qtyRequested Decimal  @db.Decimal(14, 3)
  qtyApproved  Decimal? @db.Decimal(14, 3)
  qtySent      Decimal? @db.Decimal(14, 3)
  qtyReceived  Decimal? @db.Decimal(14, 3)

  note String?

  transfer Transfer  @relation(fields: [transferId], references: [id], onDelete: Cascade)
  item     StockItem @relation(fields: [itemId], references: [id])

  @@unique([transferId, itemId])
  @@index([itemId])
}
`;

writeFileSync(F, s);
console.log("✓ Transfer, TransferLine, TransferStatus");
console.log(`  backup: ${F}.bak`);
console.log("\nშემდეგი: npx prisma migrate dev --name stock_transfers");
