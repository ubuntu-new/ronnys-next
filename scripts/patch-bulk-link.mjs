// scripts/patch-bulk-link.mjs — ბმული ხარჯვის წესების გვერდიდან
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "app/admin/stock/consumption/page.tsx";
if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }

let s = readFileSync(F, "utf8");
if (s.includes("consumption/bulk")) { console.log("უკვე დამატებულია."); process.exit(0); }

const old = `        <Link className="btn btn-ghost" href="/admin/stock">
          ← მარაგი
        </Link>`;
const neu = `        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn" href="/admin/stock/consumption/bulk">
            ტოპინგების ჯგუფური შევსება
          </Link>
          <Link className="btn btn-ghost" href="/admin/stock">
            ← მარაგი
          </Link>
        </div>`;

if (!s.includes(old)) { console.error("⚠ ვერ ვიპოვე ჰედერის ბმული — ხელით დაამატე"); process.exit(1); }

copyFileSync(F, F + ".bak");
writeFileSync(F, s.replace(old, neu));
console.log("✓ app/admin/stock/consumption/page.tsx");
