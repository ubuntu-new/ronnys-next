// scripts/fix-pizza-consumption.mjs
//
// ბაგი: ჩვეულებრივი პიცის გაყიდვაზე ტოპინგები არ ჩამოიწერებოდა.
//
// მიზეზი: `lib/menu-db.ts` პიცას `ings` სიით აწყობს, მაგრამ `defaultExtras`-ის
// გარეშე. კალათა ცარიელ `toppings`-ს აგზავნის, `computeConsumption` კი
// მხოლოდ ამას კითხულობდა — ანუ მოცარელა და პეპერონი მარაგს არ აკლდებოდა.
//
// გასწორება: პიცის ხარჯვა ითვლება როგორც
//     პროდუქტის რეცეპტი (ProductTopping) − მოხსნილი + კალათაში დამატებული
//
// ეს იმავე ლოგიკაა, რასაც ფასდადება იყენებს, ამიტომ ღირებულება და ჩამოწერა
// ერთმანეთს დაემთხვევა.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "lib/consumption.ts";
if (!existsSync(F)) {
  console.error(`ვერ ვიპოვე ${F} — გაუშვი repo-ს root-იდან.`);
  process.exit(1);
}

let s = readFileSync(F, "utf8");

if (s.includes("baseIngredients")) {
  console.log("უკვე გასწორებულია — არაფერი შევცვალე.");
  process.exit(0);
}

copyFileSync(F, F + ".bak");

// ── 1) რეცეპტების ჩატვირთვა ──
s = s.replace(
  `interface Rules {
  byProduct: Map<string, Rule[]>;
  byTopping: Map<string, Rule[]>;
  toppingIdByName: Map<string, string>;
}`,
  `interface Rules {
  byProduct: Map<string, Rule[]>;
  byTopping: Map<string, Rule[]>;
  toppingIdByName: Map<string, string>;
  /// productId → მისი რეცეპტის ტოპინგების id-ები
  baseIngredients: Map<string, string[]>;
}`,
);

s = s.replace(
  `  const [rules, toppings] = await Promise.all([
    db.consumptionRule.findMany({
      select: { itemId: true, qty: true, sizeKey: true, productId: true, toppingId: true },
    }),
    db.topping.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
  ]);`,
  `  const [rules, toppings, recipes] = await Promise.all([
    db.consumptionRule.findMany({
      select: { itemId: true, qty: true, sizeKey: true, productId: true, toppingId: true },
    }),
    db.topping.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
    // პიცის რეცეპტი — რა ტოპინგები აქვს ნაგულისხმევად
    db.productTopping.findMany({ select: { productId: true, toppingId: true } }),
  ]);`,
);

s = s.replace(
  `  return { byProduct, byTopping, toppingIdByName };`,
  `  const baseIngredients = new Map<string, string[]>();
  for (const r of recipes) {
    const list = baseIngredients.get(r.productId) ?? [];
    list.push(r.toppingId);
    baseIngredients.set(r.productId, list);
  }

  return { byProduct, byTopping, toppingIdByName, baseIngredients };`,
);

// ── 2) ტოპინგების ხარჯვა: რეცეპტი + დამატებული − მოხსნილი ──
s = s.replace(
  `/** ტოპინგების ხარჯი — ზონები გათვალისწინებული, მოხსნილები გამოკლებული. */
function addToppings(acc: Map<string, number>, R: Rules, cfg: Cfg, size: string | null, factor: number) {
  const state = (cfg.toppings ?? {}) as Record<string, { whole?: number; left?: number; right?: number }>;
  const removed = (cfg.removed ?? {}) as Record<string, boolean>;

  for (const [name, z] of Object.entries(state)) {
    if (removed[name]) continue;
    const tid = R.toppingIdByName.get(name);
    if (!tid) continue;

    const units = (z.whole || 0) + 0.5 * (z.left || 0) + 0.5 * (z.right || 0);
    if (units <= 0) continue;

    for (const r of pick(R.byTopping.get(tid), size)) {
      add(acc, r.itemId, r.qty * units * factor);
    }
  }
}`,
  `/**
 * ტოპინგების ხარჯი.
 *
 * ⚠️ ორი წყარო ერთდება:
 *   1. **პროდუქტის რეცეპტი** — ის, რაც პიცას ისედაც აქვს (მოცარელა, პეპერონი)
 *   2. **კალათაში დამატებული** — ის, რაც კლიენტმა ზემოდან დაამატა
 *
 * მოხსნილი (\`removed\`) რეცეპტიდან აკლდება.
 *
 * ადრე მხოლოდ (2) იკითხებოდა, ამიტომ ჩვეულებრივი პიცის გაყიდვაზე
 * არაფერი ჩამოიწერებოდა — ეს ბაგი food cost-ს რეალურზე დაბალს აჩვენებდა.
 */
function addToppings(
  acc: Map<string, number>,
  R: Rules,
  cfg: Cfg,
  size: string | null,
  factor: number,
  productId?: string | null,
) {
  const state = (cfg.toppings ?? {}) as Record<string, { whole?: number; left?: number; right?: number }>;
  const removed = (cfg.removed ?? {}) as Record<string, boolean>;

  // ტოპინგის id → რამდენი ერთეული იხარჯება
  const units = new Map<string, number>();

  // (1) რეცეპტი
  if (productId) {
    const removedIds = new Set(
      Object.keys(removed)
        .filter((n) => removed[n])
        .map((n) => R.toppingIdByName.get(n))
        .filter((x): x is string => !!x),
    );
    for (const tid of R.baseIngredients.get(productId) ?? []) {
      if (removedIds.has(tid)) continue;
      units.set(tid, (units.get(tid) ?? 0) + 1);
    }
  }

  // (2) კალათაში დამატებული
  for (const [name, z] of Object.entries(state)) {
    if (removed[name]) continue;
    const tid = R.toppingIdByName.get(name);
    if (!tid) continue;

    const u = (z.whole || 0) + 0.5 * (z.left || 0) + 0.5 * (z.right || 0);
    if (u <= 0) continue;
    units.set(tid, (units.get(tid) ?? 0) + u);
  }

  for (const [tid, u] of units) {
    for (const r of pick(R.byTopping.get(tid), size)) {
      add(acc, r.itemId, r.qty * u * factor);
    }
  }
}`,
);

// ── 3) გამოძახებები ──
s = s.replace(
  `      for (const r of pick(R.byProduct.get(it.refId ?? ""), size)) add(acc, r.itemId, r.qty * qty);
      addToppings(acc, R, cfg, size, qty);
      continue;`,
  `      for (const r of pick(R.byProduct.get(it.refId ?? ""), size)) add(acc, r.itemId, r.qty * qty);
      addToppings(acc, R, cfg, size, qty, it.refId);
      continue;`,
);

// ნახევარ-ნახევარი: ორივე პიცის რეცეპტი ნახევრად
s = s.replace(
  `      for (const key of ["leftId", "rightId"] as const) {
        const legacy = cfg[key];
        if (typeof legacy !== "number") continue;
        for (const r of pick(R.byProduct.get(\`pizza-\${legacy}\`), size)) {
          add(acc, r.itemId, r.qty * 0.5 * qty);
        }
      }
      addToppings(acc, R, cfg, size, qty);
      continue;`,
  `      for (const key of ["leftId", "rightId"] as const) {
        const legacy = cfg[key];
        if (typeof legacy !== "number") continue;
        const pid = \`pizza-\${legacy}\`;
        for (const r of pick(R.byProduct.get(pid), size)) {
          add(acc, r.itemId, r.qty * 0.5 * qty);
        }
        // თითოეული ნახევრის რეცეპტი — ნახევარი ულუფით
        addToppings(acc, R, { removed: cfg.removed }, size, 0.5 * qty, pid);
      }
      // კალათაში დამატებული ტოპინგები — ერთხელ, ზონების მიხედვით
      addToppings(acc, R, { toppings: cfg.toppings, removed: cfg.removed }, size, qty);
      continue;`,
);

// კომბოში პიცის რეცეპტიც
s = s.replace(
  `        for (const r of pick(R.byProduct.get(target.id), target.size)) add(acc, r.itemId, r.qty * qty);
      }
      continue;`,
  `        for (const r of pick(R.byProduct.get(target.id), target.size)) add(acc, r.itemId, r.qty * qty);
        // კომბოში პიცა თავისი რეცეპტით მოდის
        if (target.id.startsWith("pizza-")) {
          addToppings(acc, R, {}, target.size, qty, target.id);
        }
      }
      continue;`,
);

writeFileSync(F, s);
console.log("✓ lib/consumption.ts");
console.log("  პიცის ხარჯვა ახლა რეცეპტს კითხულობს, არა მხოლოდ კალათას");
console.log(`  backup: ${F}.bak`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
