// scripts/add-pos-schema.mjs
//
// POS-ისთვის ორი ველი Order-ზე:
//
//   clientRef — **იდემპოტენტობის გასაღები**. ტერმინალი ყოველ შეკვეთას თავის
//               uuid-ს აძლევს. ცუდი კავშირისას იგივე შეკვეთა ორჯერ იგზავნება;
//               unique ინდექსი მეორეს ჩუმად აჩერებს. ⚠️ ამის გარეშე ოფლაინ
//               რეჟიმი გარანტირებულად დუბლიკატებს დაბადებს.
//
//   posId     — რომელი ტერმინალიდან შემოვიდა (თუ ჯერ არ არსებობს).
//
// ორჯერ გაშვება უსაფრთხოა.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "prisma/schema.prisma";
if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }

let s = readFileSync(F, "utf8");

const start = s.indexOf("model Order {");
if (start === -1) { console.error("ვერ ვიპოვე model Order"); process.exit(1); }
const end = s.indexOf("\n}", start);
let block = s.slice(start, end);

const needClientRef = !block.includes("clientRef");
const needPosId = !block.includes("posId");

if (!needClientRef && !needPosId) {
  console.log("უკვე დამატებულია — არაფერი შევცვალე.");
  process.exit(0);
}

copyFileSync(F, F + ".bak");

let add = "";
if (needClientRef) {
  add +=
    "  /// ტერმინალის მიერ გენერირებული uuid — იგივე შეკვეთის ხელახლა გაგზავნა უვნებელია\n" +
    "  clientRef String? @unique\n";
}
if (needPosId) {
  add += "  /// რომელი POS ტერმინალიდან შემოვიდა\n  posId String?\n";
}
add += "\n";

const idx = block.indexOf("\n  @@");
block = idx !== -1 ? block.slice(0, idx + 1) + add + block.slice(idx + 1) : block + "\n" + add;

// ინდექსი ტერმინალზე რეპორტისთვის
if (needPosId && !block.includes("@@index([posId")) {
  block = block.replace(/(\n  @@index\()/, "\n  @@index([posId, createdAt])$1");
}

s = s.slice(0, start) + block + s.slice(end);
writeFileSync(F, s);

console.log(`✓ Order${needClientRef ? " · clientRef" : ""}${needPosId ? " · posId" : ""}`);
console.log(`  backup: ${F}.bak`);
console.log("\nშემდეგი: npx prisma migrate dev --name pos_fields");
