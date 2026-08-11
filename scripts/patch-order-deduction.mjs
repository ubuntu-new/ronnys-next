// scripts/patch-order-deduction.mjs
//
// შეკვეთის შექმნისას მარაგის ავტომატური ჩამოწერა + გაუქმებისას დაბრუნება.
//
// ⚠️ ჩამოწერა შეკვეთას არ აჩერებს: თუ წესი არ არსებობს ან ნაშთი არ ჰყოფნის,
//    შეკვეთა მაინც გადის, ჩანაწერი კი ჟურნალში რჩება (ნაშთი შეიძლება მინუსში
//    გავიდეს). ეს განზრახაა — გაყიდვის შეჩერება მარაგის გამო ბევრად ძვირი
//    შეცდომაა, ვიდრე უზუსტო ნაშთი.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) /api/orders — ჩამოწერა შექმნისას ──
{
  const F = "app/api/orders/route.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("computeConsumption")) {
    skip.push("api/orders");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { priceOrder, type CartLineIn } from "@/lib/order-pricing";',
      'import { priceOrder, type CartLineIn } from "@/lib/order-pricing";\n' +
        'import { computeConsumption, locationForBranch } from "@/lib/consumption";\n' +
        'import { recordMovements } from "@/lib/stock";',
    );

    s = s.replace(
      `    return NextResponse.json({
      ok: true,
      orderNo: order.orderNo,
      total: Number(order.total),
    });`,
      `    // ── მარაგის ჩამოწერა ──
    // შეკვეთა უკვე შექმნილია; ჩამოწერის ჩავარდნა მას არ აუქმებს.
    try {
      const loc = await locationForBranch(branch.id);
      if (loc) {
        const used = await computeConsumption(priced.items);
        if (used.length > 0) {
          await recordMovements(
            used.map((u) => ({
              locationId: loc.id,
              itemId: u.itemId,
              type: "sale" as const,
              qty: -u.qty,
              refType: "Order",
              refId: order.id,
              note: \`შეკვეთა #\${order.orderNo}\`,
            })),
          );
        }
      } else {
        console.warn(\`order: ფილიალს \${branch.id} საწყობის ლოკაცია არ აქვს — ჩამოწერა გამოტოვდა\`);
      }
    } catch (e) {
      console.error("order: მარაგის ჩამოწერა ჩავარდა (შეკვეთა შენარჩუნებულია)", e);
    }

    return NextResponse.json({
      ok: true,
      orderNo: order.orderNo,
      total: Number(order.total),
    });`,
    );

    writeFileSync(F, s);
    console.log("✓ app/api/orders/route.ts");
  }
}

// ── 2) admin/orders — გაუქმებისას დაბრუნება ──
{
  const F = "app/admin/orders/actions.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("stockMovement.findMany")) {
    skip.push("admin/orders");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { requirePermission, getSession } from "@/lib/admin-auth";',
      'import { requirePermission, getSession } from "@/lib/admin-auth";\n' +
        'import { recordMovements } from "@/lib/stock";',
    );

    s = s.replace(
      `  await db.auditLog.create({
    data: {
      action: \`order.\${status}\`,`,
      `  // გაუქმებისას ჩამოწერილი მარაგი ბრუნდება — უკუ-მოძრაობით, არა წაშლით
  if (status === "cancelled") {
    const moves = await db.stockMovement.findMany({
      where: { refType: "Order", refId: id, type: "sale" },
      select: { locationId: true, itemId: true, qty: true },
    });
    if (moves.length > 0) {
      await recordMovements(
        moves.map((m) => ({
          locationId: m.locationId,
          itemId: m.itemId,
          type: "count_adjust" as const,
          qty: Number(m.qty) * -1,
          refType: "Order",
          refId: id,
          note: "შეკვეთის გაუქმება — მარაგი დაბრუნდა",
          employeeId: session?.sub ?? null,
        })),
      );
    }
  }

  await db.auditLog.create({
    data: {
      action: \`order.\${status}\`,`,
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/orders/actions.ts");
  }
}

// ── 3) ნავიგაცია ──
{
  const F = "app/admin/layout.tsx";
  let s = readFileSync(F, "utf8");
  if (s.includes("/admin/stock/consumption")) {
    skip.push("ნავიგაცია");
  } else {
    s = s.replace(
      '  { href: "/admin/stock", label: "მარაგი" },',
      '  { href: "/admin/stock", label: "მარაგი" },\n' +
        '  { href: "/admin/stock/consumption", label: "ხარჯვის წესები" },',
    );
    writeFileSync(F, s);
    console.log("✓ ნავიგაცია");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
