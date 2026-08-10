// scripts/patch-orders-nav.mjs — ნავიგაციაში „შეკვეთები“ (პირველ ადგილას დაფის შემდეგ)
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const F = "app/admin/layout.tsx";
if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }

let s = readFileSync(F, "utf8");
if (s.includes("/admin/orders")) { console.log("უკვე დამატებულია."); process.exit(0); }

s = s.replace(
  '  { href: "/admin/products", label: "პროდუქტები" },',
  '  { href: "/admin/orders", label: "შეკვეთები" },\n  { href: "/admin/products", label: "პროდუქტები" },',
);
writeFileSync(F, s);
console.log("✓ ნავიგაცია");
