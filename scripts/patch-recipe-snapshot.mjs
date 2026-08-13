// scripts/patch-recipe-snapshot.mjs
//
// შეკვეთაში ინგრედიენტების ჩაწერა + ყველგან დეტალური ჩვენება.
//
// ⚠️ პრობლემა: `config.toppings` მხოლოდ **დამატებულს** ინახავდა. პიცის
// საკუთარი რეცეპტი (მოცარელა, პეპერონი) არსად არ იწერებოდა — ანუ შეკვეთის
// ჩანაწერიდან ვერ იგებდი, რისგან დამზადდა.
//
// გასწორება: `priceOrder()` ინგრედიენტების სიას წერს config-ში. ეს **ასლია** —
// თუ ხვალ რეცეპტი შეიცვლება, ძველი შეკვეთა მაინც აჩვენებს რითაც მაშინ გაკეთდა.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) order-pricing: ინგრედიენტების ასლი ──
{
  const F = "lib/order-pricing.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("ingredients:")) {
    skip.push("order-pricing");
  } else {
    copyFileSync(F, F + ".bak");

    // პიცა
    s = s.replace(
      `    config: { sizeIdx, crustIdx: line.crustIdx ?? 0, sauceIdx: line.sauceIdx ?? 2, toppings, removed: line.removed ?? {} },`,
      `    config: {
      sizeIdx,
      crustIdx: line.crustIdx ?? 0,
      sauceIdx: line.sauceIdx ?? 2,
      toppings,
      removed: line.removed ?? {},
      // რეცეპტის ასლი — ჩანაწერი უცვლელი უნდა დარჩეს, თუნდაც რეცეპტი შეიცვალოს
      ingredients: p.ings ?? [],
    },`,
    );

    // ნახევარ-ნახევარი
    s = s.replace(
      `    config: {
      leftId: L.id,
      rightId: R.id,
      sizeIdx,
      crustIdx: line.crustIdx ?? 0,
      sauceIdx: line.sauceIdx ?? 2,
      toppings: line.toppings ?? {},
    },`,
      `    config: {
      leftId: L.id,
      rightId: R.id,
      sizeIdx,
      crustIdx: line.crustIdx ?? 0,
      sauceIdx: line.sauceIdx ?? 2,
      toppings: line.toppings ?? {},
      leftIngredients: L.ings ?? [],
      rightIngredients: R.ings ?? [],
    },`,
    );

    if (!s.includes("ingredients:")) {
      console.error("⚠ ვერ ჩავამატე ინგრედიენტები — ხელით შეამოწმე order-pricing.ts");
      process.exit(1);
    }

    writeFileSync(F, s);
    console.log("✓ lib/order-pricing.ts");
  }
}

// ── 2) შეკვეთის დეტალი ──
{
  const F = "app/admin/orders/[id]/page.tsx";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("detailLines")) {
    skip.push("orders/[id]");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { setOrderStatus } from "../actions";',
      'import { setOrderStatus } from "../actions";\nimport { detailLines, lineColor } from "@/lib/item-detail";',
    );

    // ძველი შეკვეთებისთვის — მიმდინარე რეცეპტი fallback-ად
    s = s.replace(
      `  const o = await db.order.findUnique({
    where: { id },
    include: { branch: true, items: true },
  });
  if (!o) notFound();`,
      `  const o = await db.order.findUnique({
    where: { id },
    include: { branch: true, items: true },
  });
  if (!o) notFound();

  // ძველი შეკვეთები ინგრედიენტების ასლის გარეშე შეიქმნა — მათთვის
  // პროდუქტის მიმდინარე რეცეპტს ვიყენებთ, რომ სია მაინც ჩანდეს
  const productIds = o.items.map((i) => i.productId).filter((x): x is string => !!x);
  const recipes = productIds.length
    ? await db.productTopping.findMany({
        where: { productId: { in: productIds } },
        include: { topping: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      })
    : [];
  const recipeOf = (pid: string | null) =>
    pid
      ? recipes
          .filter((r) => r.productId === pid)
          .map((r) => String((r.topping.name as Record<string, unknown>)?.en ?? ""))
          .filter(Boolean)
      : [];`,
    );

    // JSON → წაკითხვადი სია
    s = s.replace(
      `                <td>
                  {i18nText(it.name)}
                  <div className="hint" style={{ whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(it.config)}
                  </div>
                </td>`,
      `                <td>
                  <b>{i18nText(it.name)}</b>
                  {(() => {
                    const lines = detailLines(it.config, recipeOf(it.productId));
                    if (lines.length === 0) return null;
                    return (
                      <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 13, lineHeight: 1.6 }}>
                        {lines.map((l, i) => (
                          <li key={i} style={{ color: lineColor(l.kind) ?? "var(--a-muted)" }}>
                            {l.kind === "removed" ? "− " : l.kind === "added" ? "+ " : ""}
                            {l.text}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </td>`,
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/orders/[id]/page.tsx");
  }
}

// ── 3) KDS — იმავე ფორმატერზე ──
{
  const F = "app/admin/kds/KdsBoard.tsx";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("item-detail")) {
    skip.push("KdsBoard");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { useCallback, useEffect, useRef, useState } from "react";',
      'import { useCallback, useEffect, useRef, useState } from "react";\nimport { detailLines, lineColor } from "@/lib/item-detail";',
    );

    // ლოკალური describe იშლება — ერთი წყარო ჯობია ორს
    s = s.replace(
      /\/\*\* Turn the stored config[\s\S]*?\n}\n\n(?=function minutesSince)/,
      "",
    );

    s = s.replace(
      `                      {o.items.map((it) => {
                        const mods = describe(it);
                        return (
                          <li key={it.id}>
                            <span className="kds-qty">{it.qty}×</span>
                            <span>
                              {it.nameKa || it.name}
                              {mods.length > 0 && <em>{mods.join(" · ")}</em>}
                            </span>
                          </li>
                        );
                      })}`,
      `                      {o.items.map((it) => {
                        const lines = detailLines(it.config);
                        return (
                          <li key={it.id}>
                            <span className="kds-qty">{it.qty}×</span>
                            <span>
                              {it.nameKa || it.name}
                              {lines.length > 0 && (
                                <em>
                                  {lines.map((l, i) => (
                                    <span key={i} style={{ color: lineColor(l.kind) }}>
                                      {i > 0 && " · "}
                                      {l.kind === "removed" ? "− " : l.kind === "added" ? "+ " : ""}
                                      {l.text}
                                    </span>
                                  ))}
                                </em>
                              )}
                            </span>
                          </li>
                        );
                      })}`,
    );

    if (s.includes("const mods = describe(it)")) {
      console.error("⚠ KDS-ის სია ვერ შევცვალე — ხელით შეამოწმე");
      process.exit(1);
    }

    writeFileSync(F, s);
    console.log("✓ app/admin/kds/KdsBoard.tsx");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
