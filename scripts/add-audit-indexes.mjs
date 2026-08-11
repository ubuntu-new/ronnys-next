// scripts/add-audit-indexes.mjs
//
// AuditLog-ს აკლია ინდექსები ავტორსა და მოქმედებაზე — მათ გარეშე
// ჟურნალის ფილტრაცია მთელი ცხრილის სკანირებაა.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "prisma/schema.prisma";
if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }

let s = readFileSync(F, "utf8");

if (s.includes("@@index([employeeId, at])")) {
  console.log("უკვე დამატებულია.");
  process.exit(0);
}

const start = s.indexOf("model AuditLog {");
if (start === -1) { console.error("ვერ ვიპოვე model AuditLog"); process.exit(1); }
const end = s.indexOf("\n}", start);
let block = s.slice(start, end);

if (!block.includes("@@index([at])")) {
  console.error("ვერ ვიპოვე @@index([at]) — ხელით შეამოწმე");
  process.exit(1);
}

block = block.replace(
  "  @@index([at])",
  "  @@index([at])\n  @@index([employeeId, at])\n  @@index([action, at])\n  @@index([branchId, at])",
);

copyFileSync(F, F + ".bak");
writeFileSync(F, s.slice(0, start) + block + s.slice(end));

console.log("✓ ინდექსები: employeeId, action, branchId");
console.log("\nშემდეგი: npx prisma migrate dev --name audit_indexes");
