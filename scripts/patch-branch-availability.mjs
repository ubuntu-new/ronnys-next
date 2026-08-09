// scripts/patch-branch-availability.mjs
//
// სამი პატჩი, ყველა იდემპოტენტური:
//   1. ნავიგაციაში „ხელმისაწვდომობა“
//   2. lib/menu-db.ts — პროდუქტი ქრება საიტიდან, თუ ყველა ფილიალშია გამორთული
//   3. app/admin/products/actions.ts — ფილიალები BranchProduct-ში იწერება, არა მასივში

import { readFileSync, writeFileSync, existsSync } from "node:fs";

let done = 0;
const skip = [];

// ── 1) ნავიგაცია ──
{
  const F = "app/admin/layout.tsx";
  if (!existsSync(F)) throw new Error(`ვერ ვიპოვე ${F}`);
  let s = readFileSync(F, "utf8");
  if (s.includes("/admin/availability")) {
    skip.push("ნავიგაცია");
  } else {
    s = s.replace(
      '  { href: "/admin/combos", label: "კომბოები" },',
      '  { href: "/admin/combos", label: "კომბოები" },\n' +
        '  { href: "/admin/availability", label: "ხელმისაწვდომობა" },',
    );
    writeFileSync(F, s);
    console.log("✓ ნავიგაცია");
    done++;
  }
}

// ── 2) lib/menu-db.ts ──
{
  const F = "lib/menu-db.ts";
  if (!existsSync(F)) throw new Error(`ვერ ვიპოვე ${F}`);
  let s = readFileSync(F, "utf8");

  if (s.includes("branchProducts")) {
    skip.push("menu-db");
  } else {
    // პროდუქტების მოთხოვნას ვამატებთ branchProducts-ს
    s = s.replace(
      "        ingredients: { include: { topping: true }, orderBy: { sortOrder: \"asc\" } },\n        promo: true,",
      "        ingredients: { include: { topping: true }, orderBy: { sortOrder: \"asc\" } },\n        promo: true,\n        branchProducts: true,",
    );

    // ფილტრი — ყველგან გამორთული პროდუქტი საიტზე არ ჩანს
    s = s.replace(
      "  const set = Object.fromEntries(settings.map((s) => [s.key, s.value])) as Record<string, Json>;",
      `  // ყველა აქტიურ ფილიალში გამორთული პროდუქტი საიტზე არ ჩანს.
  // (ფილიალის მიხედვით ფილტრაცია მაშინ ჩაირთვება, როცა საიტს ფილიალის არჩევა დაემატება)
  const branchCount = branches.length;
  const soldSomewhere = (p: { branchProducts: { available: boolean }[] }) => {
    if (branchCount === 0) return true;
    const off = p.branchProducts.filter((bp) => !bp.available).length;
    return off < branchCount;
  };
  products = products.filter(soldSomewhere);

  const set = Object.fromEntries(settings.map((s) => [s.key, s.value])) as Record<string, Json>;`,
    );

    // const → let, რომ ფილტრი მიენიჭოს
    s = s.replace(
      "  const [products, toppings, combos, branches, settings] = await Promise.all([",
      "  let [products, toppings, combos, branches, settings] = await Promise.all([",
    );
    s = s.replace(
      "export async function getMenu(): Promise<MenuPayload> {",
      "export async function getMenu(): Promise<MenuPayload> {\n  /* eslint-disable prefer-const */",
    );

    writeFileSync(F, s);
    console.log("✓ lib/menu-db.ts");
    done++;
  }
}

// ── 3) products/actions.ts ──
{
  const F = "app/admin/products/actions.ts";
  if (!existsSync(F)) throw new Error(`ვერ ვიპოვე ${F}`);
  let s = readFileSync(F, "utf8");

  if (s.includes("branchProduct")) {
    skip.push("products/actions");
  } else {
    s = s.replace(
      `  // ფილიალები: მონიშნული = ხელმისაწვდომია → disabledBranches არის დანარჩენი
  const allBranches = await db.branch.findMany({ select: { id: true } });
  const availableIn = fd.getAll("availableIn").map(String);
  const disabledBranches = fd.get("branches_present")
    ? allBranches.map((b) => b.id).filter((bid) => !availableIn.includes(bid))
    : undefined;`,
      `  // ფილიალები — ახლა BranchProduct-ში (მასივი აღარ გამოიყენება)
  const allBranches = await db.branch.findMany({ where: { deletedAt: null }, select: { id: true } });
  const availableIn = new Set(fd.getAll("availableIn").map(String));`,
    );

    s = s.replace(
      `      ...(disabledBranches ? { disabledBranches } : {}),
      updatedBy: session.sub,`,
      `      updatedBy: session.sub,`,
    );

    s = s.replace(
      `  // ── ნაგულისხმევი ინგრედიენტები ──`,
      `  // ── ფილიალებში ხელმისაწვდომობა ──
  if (fd.get("branches_present") !== null) {
    for (const b of allBranches) {
      const available = availableIn.has(b.id);
      const existing = await db.branchProduct.findUnique({
        where: { branchId_productId: { branchId: b.id, productId: id } },
      });
      if (!existing) {
        if (available) continue; // ჩანაწერის არარსებობა = ხელმისაწვდომია
        await db.branchProduct.create({
          data: { branchId: b.id, productId: id, available: false, updatedBy: session.sub },
        });
        continue;
      }
      if (existing.available !== available) {
        await db.branchProduct.update({
          where: { id: existing.id },
          data: { available, updatedBy: session.sub },
        });
      }
    }
  }

  // ── ნაგულისხმევი ინგრედიენტები ──`,
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/products/actions.ts");
    done++;
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log(`\nგანახლდა ${done} ფაილი`);
