// scripts/patch-audit-nav.mjs — ნავიგაციაში „ჟურნალი" (არქივის გვერდით)
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const F = "app/admin/layout.tsx";
if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }

let s = readFileSync(F, "utf8");
if (s.includes("/admin/audit")) { console.log("უკვე დამატებულია."); process.exit(0); }

s = s.replace(
  '  { href: "/admin/archive", label: "არქივი" },',
  '  { href: "/admin/audit", label: "ჟურნალი" },\n  { href: "/admin/archive", label: "არქივი" },',
);
writeFileSync(F, s);
console.log("✓ ნავიგაცია");
