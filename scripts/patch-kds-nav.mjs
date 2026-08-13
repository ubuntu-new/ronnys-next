// scripts/patch-kds-nav.mjs — ნავიგაციაში „Kitchen"
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const F = "app/admin/layout.tsx";
if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }

let s = readFileSync(F, "utf8");
if (s.includes("/admin/kds")) { console.log("უკვე დამატებულია."); process.exit(0); }

const old = '  { href: "/admin/orders", label: "Orders" },';
if (!s.includes(old)) { console.error("⚠ ვერ ვიპოვე Orders-ის ხაზი"); process.exit(1); }

s = s.replace(old, `${old}\n  { href: "/admin/kds", label: "Kitchen" },`);
writeFileSync(F, s);
console.log("✓ ნავიგაცია");
