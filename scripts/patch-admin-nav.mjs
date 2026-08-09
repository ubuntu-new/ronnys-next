// scripts/patch-admin-nav.mjs
// ნავიგაციაში ამატებს „თანამშრომლებს“ და „ფასდაკლებებს“.
// ორჯერ გაშვება უსაფრთხოა.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const F = "app/admin/layout.tsx";
if (!existsSync(F)) {
  console.error(`ვერ ვიპოვე ${F}`);
  process.exit(1);
}

let s = readFileSync(F, "utf8");
let n = 0;

if (!s.includes('/admin/employees')) {
  s = s.replace(
    '  { href: "/admin/settings", label: "პარამეტრები" },',
    '  { href: "/admin/employees", label: "თანამშრომლები" },\n' +
      '  { href: "/admin/discounts", label: "ფასდაკლებები" },\n' +
      '  { href: "/admin/settings", label: "პარამეტრები" },',
  );
  n++;
}

if (n) {
  writeFileSync(F, s);
  console.log("✓ ნავიგაცია განახლდა");
} else {
  console.log("უკვე დამატებულია — არაფერი შევცვალე");
}
