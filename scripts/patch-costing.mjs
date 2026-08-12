// scripts/patch-costing.mjs
//
//  1. მიღების ფორმას ემატება ფასის ველი (/admin/stock)
//  2. addMovement — ფასი იწერება, საშუალო გადაითვლება
//  3. ჩამოწერა/გაყიდვა — მიმდინარე საშუალო ეწერება მოძრაობას
//  4. ნავიგაცია — „თვითღირებულება"
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1+2) actions ──
{
  const F = "app/admin/stock/actions.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("applyReceiptCost")) {
    skip.push("stock/actions");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { recordMovement, stockCount } from "@/lib/stock";',
      'import { recordMovement, stockCount } from "@/lib/stock";\nimport { applyReceiptCost, applyOutgoingCost } from "@/lib/costing";',
    );

    s = s.replace(
      `    // ჩამოწერა ყოველთვის მინუსია — ნიშანს მომხმარებელს არ ვაწერინებთ
    await recordMovement({
      locationId,
      itemId,
      type: kind === "waste" ? "waste" : "receipt",
      qty: kind === "waste" ? -amount : amount,
      note: fdStr(fd, "note") || null,
      employeeId: s.sub,
    });`,
      `    // ჩამოწერა ყოველთვის მინუსია — ნიშანს მომხმარებელს არ ვაწერინებთ
    const mv = await recordMovement({
      locationId,
      itemId,
      type: kind === "waste" ? "waste" : "receipt",
      qty: kind === "waste" ? -amount : amount,
      note: fdStr(fd, "note") || null,
      employeeId: s.sub,
    });

    // ── თვითღირებულება ──
    if (kind === "waste") {
      // ჩამოწერა მიმდინარე საშუალოთი ფასდება; საშუალო არ იცვლება
      await applyOutgoingCost(locationId, itemId, amount, mv.id);
    } else {
      const unitCost = fdNum(fd, "unitCost");
      if (unitCost !== null && unitCost > 0) {
        await applyReceiptCost(locationId, itemId, amount, unitCost, mv.id);
      }
    }`,
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/stock/actions.ts");
  }
}

// ── 3) ფასის ველი ფორმაში ──
{
  const F = "app/admin/stock/page.tsx";
  let s = readFileSync(F, "utf8");

  if (s.includes("unitCost")) {
    skip.push("stock/page");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      `            <div className="field">
              <label htmlFor="note">შენიშვნა</label>
              <input id="note" name="note" type="text" placeholder="მიმწოდებელი, მიზეზი…" />
            </div>`,
      `            <div className="field-row">
              <div className="field">
                <label htmlFor="unitCost">ერთეულის ფასი (₾)</label>
                <input id="unitCost" name="unitCost" type="number" step="0.0001" min="0" placeholder="მხოლოდ მიღებისას" />
                <span className="hint">
                  შესყიდვის ფასი ერთეულზე. ამის გარეშე თვითღირებულება ვერ დაითვლება.
                </span>
              </div>
              <div className="field">
                <label htmlFor="note">შენიშვნა</label>
                <input id="note" name="note" type="text" placeholder="მიმწოდებელი, მიზეზი…" />
              </div>
            </div>`,
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/stock/page.tsx");
  }
}

// ── 4) გაყიდვის ჩამოწერა ──
{
  const F = "app/api/orders/route.ts";
  let s = readFileSync(F, "utf8");

  if (s.includes("applyOutgoingCost")) {
    skip.push("api/orders");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { recordMovements } from "@/lib/stock";',
      'import { recordMovements } from "@/lib/stock";\nimport { applyOutgoingCost } from "@/lib/costing";',
    );

    s = s.replace(
      `        if (used.length > 0) {
          await recordMovements(`,
      `        if (used.length > 0) {
          const created = await recordMovements(`,
    );

    s = s.replace(
      `          );
        }
      } else {
        console.warn(`,
      `          );

          // ჩამოწერის ღირებულება მიმდინარე საშუალოთი — რეპორტისთვის
          for (const [i, m] of created.entries()) {
            await applyOutgoingCost(loc.id, used[i].itemId, used[i].qty, m.id);
          }
        }
      } else {
        console.warn(`,
    );

    writeFileSync(F, s);
    console.log("✓ app/api/orders/route.ts");
  }
}

// ── 5) ნავიგაცია ──
{
  const F = "app/admin/layout.tsx";
  let s = readFileSync(F, "utf8");
  if (s.includes("/admin/stock/costing")) {
    skip.push("ნავიგაცია");
  } else {
    s = s.replace(
      '  { href: "/admin/stock/production", label: "წარმოება" },',
      '  { href: "/admin/stock/production", label: "წარმოება" },\n' +
        '  { href: "/admin/stock/costing", label: "თვითღირებულება" },',
    );
    writeFileSync(F, s);
    console.log("✓ ნავიგაცია");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
