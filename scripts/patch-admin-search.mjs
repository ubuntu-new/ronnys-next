// scripts/patch-admin-search.mjs
//
// ცხრილების ძებნა — ერთი კომპონენტი, ერთი ხაზი layout-ში, პლუს სტილი.
//
// განზრახ არ ვეხები თითო სიის გვერდს: 10+ regex-პატჩი ზედიზედ ორჯერ
// ჩამოაგდო საიტი. აქ ცვლილება ორ ფაილშია და ქცევა ყველგან იდენტურია.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) layout.tsx ──
{
  const F = "app/admin/layout.tsx";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("AdminSearch")) {
    skip.push("layout");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { logout } from "./actions";',
      'import { logout } from "./actions";\nimport AdminSearch from "./_components/AdminSearch";',
    );

    // Suspense — useSearchParams-ს სჭირდება
    if (!/from "react"/.test(s)) {
      s = s.replace('import Link from "next/link";', 'import { Suspense } from "react";\nimport Link from "next/link";');
    }

    const old = '          <main className="admin-main">{children}</main>';
    const neu = `          <main className="admin-main">
            <Suspense fallback={null}>
              <AdminSearch />
            </Suspense>
            {children}
          </main>`;

    if (!s.includes(old)) {
      console.error("⚠ ვერ ვიპოვე <main> — ხელით შეამოწმე layout.tsx");
      process.exit(1);
    }
    s = s.replace(old, neu);

    writeFileSync(F, s);
    console.log("✓ app/admin/layout.tsx");
  }
}

// ── 2) admin.css ──
{
  const F = "app/admin/admin.css";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let css = readFileSync(F, "utf8");

  if (css.includes(".admin-search")) {
    skip.push("admin.css");
  } else {
    css += `

/* ── ცხრილების ძებნა ── */
.admin-search {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0 14px;
  background: var(--a-bg);
}
.admin-search input {
  flex: 1;
  max-width: 420px;
  border: 1px solid var(--a-line);
  border-radius: 8px;
  padding: 8px 12px;
  font: inherit;
  background: #fff;
}
.admin-search input:focus {
  outline: none;
  border-color: var(--a-saffron);
  box-shadow: 0 0 0 3px rgba(241, 195, 56, .25);
}
.admin-search-count {
  font-size: 13px;
  color: var(--a-muted);
  white-space: nowrap;
}
.admin-search button {
  background: none;
  border: 1px solid var(--a-line);
  color: var(--a-muted);
  padding: 7px 12px;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.admin-search button:hover { background: #f5f5f4; color: var(--a-ink); }

@media (max-width: 760px) {
  .admin-search { position: static; }
  .admin-search input { max-width: none; }
}
`;
    writeFileSync(F, css);
    console.log("✓ app/admin/admin.css");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
