// scripts/patch-cashier-visible.mjs
//
// „ვინ გაყიდა" — ჩაწერა და ჩვენება.
//
// ⚠️ `createdByEmployee` სქემაში თავიდანვე იყო, მაგრამ **არავინ ავსებდა**.
// მოლარეს ვაიდენტიფიცირებდით, სესიას ვიცავდით, ეკრანს ვკეტავდით — მერე კი
// შედეგს არსად ვაჩვენებდით. სახელი მხოლოდ ჟურნალში იყო ჩამარხული.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) POS — ჩაწერა ──
{
  const F = "app/api/pos/orders/route.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("createdByEmployee")) {
    skip.push("pos/orders");
  } else {
    copyFileSync(F, F + ".bak");
    s = s.replace(
      "        posId: session.posId,",
      "        posId: session.posId,\n        createdByEmployee: session.sub,",
    );
    if (!s.includes("createdByEmployee")) {
      console.error("⚠ ვერ ვიპოვე posId-ის ხაზი");
      process.exit(1);
    }
    writeFileSync(F, s);
    console.log("✓ app/api/pos/orders/route.ts");
  }
}

// ── 2) ხელით შეკვეთა — ჩაწერა ──
{
  const F = "app/admin/orders/actions.ts";
  let s = readFileSync(F, "utf8");

  if (s.includes("createdByEmployee")) {
    skip.push("admin/orders actions");
  } else {
    copyFileSync(F, F + ".bak");
    s = s.replace(
      '      source: "phone",',
      '      source: "phone",\n      createdByEmployee: session.sub,',
    );
    if (!s.includes("createdByEmployee")) {
      console.error("⚠ ვერ ვიპოვე source: phone");
      process.exit(1);
    }
    writeFileSync(F, s);
    console.log("✓ app/admin/orders/actions.ts");
  }
}

// ── 3) სია — ვინ გაყიდა ──
{
  const F = "app/admin/orders/page.tsx";
  let s = readFileSync(F, "utf8");

  if (s.includes("createdBy:")) {
    skip.push("orders/page");
  } else {
    copyFileSync(F, F + ".bak2");

    s = s.replace(
      "include: { branch: true, driver: { select: { name: true } }, _count: { select: { items: true } } },",
      "include: {\n        branch: true,\n        driver: { select: { name: true } },\n        createdBy: { select: { name: true } },\n        _count: { select: { items: true } },\n      },",
    );

    // ახალი სვეტი — წყაროსა და ავტორის ერთად
    s = s.replace(
      "                <th>ფილიალი</th>",
      "                <th>ფილიალი</th>\n                <th style={{ width: 140 }}>ვინ</th>",
    );

    s = s.replace(
      "                  <td>{i18nText(o.branch.name)}</td>",
      `                  <td>{i18nText(o.branch.name)}</td>
                  <td>
                    {o.createdBy ? (
                      o.createdBy.name
                    ) : (
                      <span className="hint">{o.source === "web" ? "საიტი" : o.source}</span>
                    )}
                    {o.posId && <div className="hint">{o.posId}</div>}
                  </td>`,
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/orders/page.tsx");
  }
}

// ── 4) დეტალი — ვინ გაყიდა ──
{
  const F = "app/admin/orders/[id]/page.tsx";
  let s = readFileSync(F, "utf8");

  if (s.includes("createdBy:")) {
    skip.push("orders/[id]");
  } else {
    copyFileSync(F, F + ".bak2");

    s = s.replace(
      "    include: { branch: true, items: true },",
      "    include: {\n      branch: true,\n      items: true,\n      createdBy: { select: { name: true, role: true } },\n      driver: { select: { name: true } },\n    },",
    );

    s = s.replace(
      `            <tr>
              <td style={{ width: 160 }}>სახელი</td>`,
      `            {(o.createdBy || o.posId) && (
              <tr>
                <td style={{ width: 160 }}>ვინ მიიღო</td>
                <td>
                  {o.createdBy?.name ?? (o.source === "web" ? "საიტიდან" : o.source)}
                  {o.posId && <span className="hint"> · {o.posId}</span>}
                </td>
              </tr>
            )}
            {o.driver && (
              <tr>
                <td>ვინ წაიღო</td>
                <td>
                  🛵 {o.driver.name}
                  {o.deliveredAt && (
                    <span className="hint">
                      {" "}
                      · მიიტანა {new Date(o.deliveredAt).toLocaleString("ka-GE")}
                    </span>
                  )}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ width: 160 }}>სახელი</td>`,
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/orders/[id]/page.tsx");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
