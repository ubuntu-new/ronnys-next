// scripts/patch-production-nav.mjs — ნავიგაციაში „წარმოება"
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const F = "app/admin/layout.tsx";
if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }

let s = readFileSync(F, "utf8");
if (s.includes("/admin/stock/production")) { console.log("უკვე დამატებულია."); process.exit(0); }

s = s.replace(
  '  { href: "/admin/stock/transfers", label: "გადატანები" },',
  '  { href: "/admin/stock/transfers", label: "გადატანები" },\n' +
    '  { href: "/admin/stock/production", label: "წარმოება" },',
);
writeFileSync(F, s);
console.log("✓ ნავიგაცია");
