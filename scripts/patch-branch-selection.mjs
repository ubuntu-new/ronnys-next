// scripts/patch-branch-selection.mjs
//
// ფილიალის არჩევა და მენიუს ფილტრი.
//
//   1. lib/menu-db.ts   — payload-ს ემატება branches + availability
//   2. app/[lang]/page.tsx — ორივე გადაეცემა ClientApp-ს
//   3. components/ClientApp.tsx — BranchProvider + BranchBar + ფილტრი
//   4. app/globals.css  — ზოლის სტილი
//
// ⚠️ ფილტრი კლიენტზეა განზრახ: სერვერზე cookie-ს წაკითხვა ISR-ს გამორთავდა
//    და ყოველი ვიზიტი ბაზას დაარტყამდა. მთელი მენიუ ერთხელ იგზავნება,
//    ფილიალი კი ბრაუზერში ფილტრავს — მყისიერად, ბაზის გარეშე.
//
// ⚠️ წინაპირობა: ჯერ fix-hh-guard.mjs უნდა გაეშვას, თორემ ფილიალის არჩევისას
//    ნახევარ-ნახევრის პრესეტი გატეხილ პიცაზე მიუთითებს და გვერდი ჩამოვარდება.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const files = {
  menu: "lib/menu-db.ts",
  page: "app/[lang]/page.tsx",
  app: "components/ClientApp.tsx",
  css: "app/globals.css",
};

for (const f of Object.values(files)) {
  if (!existsSync(f)) {
    console.error(`ვერ ვიპოვე ${f} — გაუშვი repo-ს root-იდან.`);
    process.exit(1);
  }
}

const skip = [];

// ─────────────────────────────────────────────
// 1) lib/menu-db.ts
// ─────────────────────────────────────────────
{
  const F = files.menu;
  let s = readFileSync(F, "utf8");

  if (s.includes("getBranchData")) {
    skip.push("menu-db");
  } else {
    copyFileSync(F, F + ".bak");

    s += `

// ─────────────────────────────────────────────
// ფილიალები + ხელმისაწვდომობა (კლიენტის ფილტრისთვის)
// ─────────────────────────────────────────────

export interface BranchInfo {
  id: string;
  code: string;
  name: string;
  name_ka: string;
  address: string;
  address_ka: string;
}

export interface AvailabilityMap {
  [branchId: string]: { pizzas: number[]; items: string[] };
}

/** ერთი მოთხოვნა — ფილიალების სია და რა არ იყიდება სად. */
export async function getBranchData(): Promise<{
  branches: BranchInfo[];
  availability: AvailabilityMap;
}> {
  const [branchRows, off] = await Promise.all([
    db.branch.findMany({ where: { deletedAt: null, active: true }, orderBy: { sortOrder: "asc" } }),
    db.branchProduct.findMany({
      where: { available: false },
      include: { product: { select: { id: true, type: true, legacyId: true, deletedAt: true } } },
    }),
  ]);

  const branches: BranchInfo[] = branchRows.map((b) => ({
    id: b.id,
    code: b.code,
    name: txt(b.name, "en"),
    name_ka: txt(b.name, "ka"),
    address: txt(b.address, "en"),
    address_ka: txt(b.address, "ka"),
  }));

  const availability: AvailabilityMap = {};
  for (const b of branches) availability[b.id] = { pizzas: [], items: [] };

  for (const row of off) {
    const bucket = availability[row.branchId];
    if (!bucket || row.product.deletedAt) continue;

    if (row.product.type === "pizza") {
      if (row.product.legacyId != null) bucket.pizzas.push(row.product.legacyId);
    } else {
      // menu-db-ში item.id პრეფიქსის გარეშეა (side-cola → cola)
      bucket.items.push(row.product.id.replace(/^(side|drink)-/, ""));
    }
  }

  return { branches, availability };
}
`;

    writeFileSync(F, s);
    console.log("✓ lib/menu-db.ts");
  }
}

// ─────────────────────────────────────────────
// 2) app/[lang]/page.tsx
// ─────────────────────────────────────────────
{
  const F = files.page;
  let s = readFileSync(F, "utf8");

  if (s.includes("getBranchData")) {
    skip.push("page");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { getMenu } from "@/lib/menu-db";',
      'import { getMenu, getBranchData } from "@/lib/menu-db";',
    );

    s = s.replace(
      `  let menu = null;
  try {
    menu = await getMenu();
  } catch (e) {`,
      `  let menu = null;
  let branchData: Awaited<ReturnType<typeof getBranchData>> = {
    branches: [],
    availability: {},
  };
  try {
    menu = await getMenu();
    branchData = await getBranchData();
  } catch (e) {`,
    );

    s = s.replace(
      "return <ClientApp lang={lang as Lang} menu={menu} />;",
      `return (
    <ClientApp
      lang={lang as Lang}
      menu={menu}
      branches={branchData.branches}
      availability={branchData.availability}
    />
  );`,
    );

    writeFileSync(F, s);
    console.log("✓ app/[lang]/page.tsx");
  }
}

// ─────────────────────────────────────────────
// 3) components/ClientApp.tsx
// ─────────────────────────────────────────────
{
  const F = files.app;
  let s = readFileSync(F, "utf8");

  if (s.includes("BranchProvider")) {
    skip.push("ClientApp");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { applyMenu, type Lang, type MenuPayload } from "@/lib/data";',
      `import { applyMenu, type Lang, type MenuPayload } from "@/lib/data";
import { BranchProvider, useBranch, type BranchInfo, type AvailabilityMap } from "@/lib/branch";
import BranchBar from "@/components/BranchBar";`,
    );

    // შიდა კომპონენტი — ფილიალის მიხედვით მენიუს ფილტრი
    s = s.replace(
      "export default function ClientApp(",
      `/**
 * მენიუს ფილტრი არჩეული ფილიალის მიხედვით.
 * ფილიალის შეცვლისას applyMenu ხელახლა ეშვება და key ცვლის — ხე ხელახლა იხატება.
 */
function MenuGate({ menu, availability }: { menu?: MenuPayload | null; availability: AvailabilityMap }) {
  const { branchId } = useBranch();

  const filtered = useMemo(() => {
    if (!menu) return null;
    const off = branchId ? availability[branchId] : null;
    if (!off) return menu;

    const badPizzas = new Set(off.pizzas);
    const badItems = new Set(off.items);

    return {
      ...menu,
      PIZZAS: menu.PIZZAS.filter((p) => !badPizzas.has(p.id)),
      EXTRAS: menu.EXTRAS.filter((i) => !badItems.has(i.id)),
      SAUCES: menu.SAUCES.filter((i) => !badItems.has(i.id)),
      DRINKS: menu.DRINKS.filter((i) => !badItems.has(i.id)),
    };
  }, [menu, availability, branchId]);

  applyMenu(filtered);

  return (
    <AppViewport key={branchId ?? "all"}>
      <Header />
      <TrustBar />
      <BranchBar />
      <CatNav />
      <MenuBody />
      <Footer />
      <Customizer />
      <HalfHalf />
      <StickBuilder />
      <ComboBuilder />
      <CartDrawer />
      <Checkout />
      <Toast />
    </AppViewport>
  );
}

export default function ClientApp(`,
    );

    // ხელმოწერა + სხეული
    s = s.replace(
      "{ lang, menu }: { lang: Lang; menu?: MenuPayload | null }",
      `{
  lang,
  menu,
  branches = [],
  availability = {},
}: {
  lang: Lang;
  menu?: MenuPayload | null;
  branches?: BranchInfo[];
  availability?: AvailabilityMap;
}`,
    );

    // ძველი ხე იცვლება MenuGate-ით
    s = s.replace(
      /      <CartProvider>\n        <AppViewport>[\s\S]*?<\/AppViewport>\n      <\/CartProvider>/,
      `      <CartProvider>
        <BranchProvider branches={branches}>
          <MenuGate menu={menu} availability={availability} />
        </BranchProvider>
      </CartProvider>`,
    );

    s = s.replace('import { useState } from "react";', 'import { useMemo, useState } from "react";');

    writeFileSync(F, s);
    console.log("✓ components/ClientApp.tsx");
  }
}

// ─────────────────────────────────────────────
// 4) globals.css
// ─────────────────────────────────────────────
{
  const F = files.css;
  let css = readFileSync(F, "utf8");

  if (css.includes(".branch-bar")) {
    skip.push("globals.css");
  } else {
    css += `

/* ── ფილიალის ამრჩევი ── */
.branch-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 16px;
  margin: 0 auto;
  max-width: 1200px;
  font-size: 14px;
}
.branch-bar-unset { opacity: 0.95; }
.branch-bar-label { font-weight: 600; }
.branch-bar-select {
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  padding: 6px 10px;
  font: inherit;
  background: #fff;
  cursor: pointer;
}
.branch-bar-hint { font-size: 13px; opacity: 0.7; }
@media (max-width: 560px) {
  .branch-bar-hint { flex-basis: 100%; }
}
`;
    writeFileSync(F, css);
    console.log("✓ app/globals.css");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
