// scripts/patch-stock-nav.mjs — ნავიგაციაში „მარაგი"
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const F = "app/admin/layout.tsx";
if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }

let s = readFileSync(F, "utf8");
if (s.includes("/admin/stock")) { console.log("უკვე დამატებულია."); process.exit(0); }

s = s.replace(
  '  { href: "/admin/branches", label: "ფილიალები" },',
  '  { href: "/admin/stock", label: "მარაგი" },\n  { href: "/admin/branches", label: "ფილიალები" },',
);
writeFileSync(F, s);
console.log("✓ ნავიგაცია");
