// scripts/patch-transfers.mjs
//
//  1. ნავიგაცია — „გადატანები"
//  2. ზარი layout-ში
//  3. სტილი admin.css-ში
//  4. კომბოს შენახვისას საიტის მყისიერი განახლება (აქამდე მხოლოდ პროდუქტს/ტოპინგს ჰქონდა)
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1+2) layout ──
{
  const F = "app/admin/layout.tsx";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");
  let touched = false;

  if (!s.includes("/admin/stock/transfers")) {
    s = s.replace(
      '  { href: "/admin/stock", label: "მარაგი" },',
      '  { href: "/admin/stock", label: "მარაგი" },\n' +
        '  { href: "/admin/stock/transfers", label: "გადატანები" },',
    );
    touched = true;
  }

  if (!s.includes("AlertBell")) {
    s = s.replace(
      'import AdminSearch from "./_components/AdminSearch";',
      'import AdminSearch from "./_components/AdminSearch";\nimport AlertBell from "./_components/AlertBell";',
    );

    const old = `            <div className="admin-brand">
              Ronny&apos;s <span>Admin</span>
            </div>`;
    const neu = `            <div className="admin-brand">
              Ronny&apos;s <span>Admin</span>
              <AlertBell />
            </div>`;

    if (s.includes(old)) {
      s = s.replace(old, neu);
      touched = true;
    } else {
      console.warn("⚠ ვერ ვიპოვე admin-brand — ზარი ხელით ჩასვი");
    }
  }

  if (touched) {
    copyFileSync(F, F + ".bak");
    writeFileSync(F, s);
    console.log("✓ app/admin/layout.tsx");
  } else skip.push("layout");
}

// ── 3) სტილი ──
{
  const F = "app/admin/admin.css";
  let css = readFileSync(F, "utf8");
  if (css.includes(".alert-bell")) {
    skip.push("admin.css");
  } else {
    css += `

/* ── შეტყობინებების ზარი ── */
.admin-brand { position: relative; display: flex; align-items: center; gap: 8px; }
.alert-bell { position: relative; margin-left: auto; }
.alert-bell > button {
  background: none;
  border: 0;
  cursor: pointer;
  font-size: 17px;
  line-height: 1;
  padding: 4px;
  position: relative;
}
.alert-bell-dot {
  position: absolute;
  top: -4px;
  right: -6px;
  background: var(--a-danger);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  min-width: 17px;
  height: 17px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  padding: 0 4px;
}
.alert-bell-menu {
  position: absolute;
  top: 30px;
  right: 0;
  z-index: 30;
  background: #fff;
  color: var(--a-ink);
  border: 1px solid var(--a-line);
  border-radius: 10px;
  min-width: 250px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .12);
  overflow: hidden;
}
.alert-bell-menu a {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  color: var(--a-ink);
  text-decoration: none;
  font-size: 14px;
  border-bottom: 1px solid var(--a-line);
}
.alert-bell-menu a:last-child { border-bottom: 0; }
.alert-bell-menu a:hover { background: #faf9f7; }
.alert-bell-menu a b { color: var(--a-orange); }
.alert-bell-empty { padding: 14px; font-size: 14px; color: var(--a-muted); }
`;
    writeFileSync(F, css);
    console.log("✓ app/admin/admin.css");
  }
}

// ── 4) კომბო → საიტის განახლება ──
{
  const F = "app/admin/combos/actions.ts";
  if (!existsSync(F)) {
    console.warn("⚠ combos/actions.ts ვერ ვიპოვე — გამოტოვდა");
  } else {
    let s = readFileSync(F, "utf8");
    if (s.includes('revalidatePath("/", "layout")')) {
      skip.push("combos");
    } else {
      s = s.replaceAll(
        '  revalidatePath("/admin/combos");',
        '  revalidatePath("/admin/combos");\n  revalidatePath("/", "layout"); // საიტის მენიუ მაშინვე განახლდეს',
      );
      writeFileSync(F, s);
      console.log("✓ app/admin/combos/actions.ts");
    }
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
