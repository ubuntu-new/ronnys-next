// scripts/add-archive-fields.mjs
//
// `deletedAt` ემატება Employee-სა და Discount-ს, რომ ისინიც არქივში გადავიდნენ,
// და არა წაიშალონ. სქემას ხელით არ ვწერთ თავიდან — მხოლოდ ეს ორი ველი ემატება.
//
// ორჯერ გაშვება უსაფრთხოა.
//
// გაშვება:  node scripts/add-archive-fields.mjs

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const FILE = "prisma/schema.prisma";

if (!existsSync(FILE)) {
  console.error(`ვერ ვიპოვე ${FILE} — გაუშვი repo-ს root-იდან.`);
  process.exit(1);
}

let src = readFileSync(FILE, "utf8");
copyFileSync(FILE, FILE + ".bak");

/** მოდელის ბლოკში ამატებს deletedAt-ს პირველ @@index-მდე (ან ბლოკის ბოლოს). */
function addDeletedAt(text, modelName) {
  const head = `model ${modelName} {`;
  const start = text.indexOf(head);
  if (start === -1) {
    console.warn(`  ⚠ ვერ ვიპოვე model ${modelName}`);
    return text;
  }
  const end = text.indexOf("\n}", start);
  let block = text.slice(start, end);

  if (block.includes("deletedAt")) {
    console.log(`  ${modelName}: უკვე აქვს`);
    return text;
  }

  const field =
    "  // არქივი: ფიზიკურად არაფერი იშლება\n" +
    "  deletedAt DateTime?\n" +
    "  @@index([deletedAt])\n\n";

  const idx = block.indexOf("\n  @@index(");
  if (idx !== -1) {
    block = block.slice(0, idx + 1) + field + block.slice(idx + 1);
  } else {
    block = block.replace(/\s*$/, "\n\n" + field);
  }

  console.log(`  ✓ ${modelName}`);
  return text.slice(0, start) + block + text.slice(end);
}

for (const m of ["Employee", "Discount"]) {
  src = addDeletedAt(src, m);
}

writeFileSync(FILE, src);
console.log(`\nbackup: ${FILE}.bak`);
console.log("შემდეგი: npx prisma migrate dev --name staff_discount_archive");
