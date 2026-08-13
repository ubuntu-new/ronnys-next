// scripts/patch-manual-order.mjs
//
// ხელით შეკვეთის შექმნა — ტელეფონით ან ადგილზე მისული.
//
//  1. orders/actions.ts — createManualOrder
//  2. orders/page.tsx — „+ New order" ღილაკი
//
// ⚠️ ფასს იმავე `priceOrder()` ითვლის, რასაც საიტი. ხელით შეყვანილი
//    ჯამი განზრახ არ არსებობს — ტელეფონის შეკვეთა და საიტის შეკვეთა
//    ვერასდროს დაშორდება ერთმანეთს.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) actions ──
{
  const F = "app/admin/orders/actions.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("createManualOrder")) {
    skip.push("actions");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { recordMovements } from "@/lib/stock";',
      `import { recordMovements } from "@/lib/stock";
import { redirect } from "next/navigation";
import { getMenu } from "@/lib/menu-db";
import { priceOrder, type CartLineIn } from "@/lib/order-pricing";
import { computeConsumption, locationForBranch } from "@/lib/consumption";
import { applyOutgoingCost } from "@/lib/costing";
import { logAction } from "@/lib/audit";`,
    );

    s += `
/**
 * ხელით შეკვეთა — ტელეფონით ან ადგილზე.
 *
 * ფასს **სერვერი** ითვლის იმავე ფუნქციით, რასაც საიტი (\`priceOrder\`).
 * ხელით შეყვანილი ჯამის ველი განზრახ არ არსებობს: ორი გზა ერთსა და იმავე
 * პროდუქტს ერთსა და იმავე ფასად უნდა ყიდდეს, თორემ ჩეკები და რეპორტები
 * ერთმანეთს დაშორდება.
 */
export async function createManualOrder(fd: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not signed in");

  const branchId = String(fd.get("branchId") ?? "");
  const fulfillment = fd.get("fulfillment") === "pickup" ? "pickup" : "delivery";
  const customerName = String(fd.get("customerName") ?? "").trim();
  const customerPhone = String(fd.get("customerPhone") ?? "").trim();
  const address = String(fd.get("address") ?? "").trim();
  const notes = String(fd.get("notes") ?? "").trim();

  const fail = (msg: string) => redirect(\`/admin/orders/new?error=\${encodeURIComponent(msg)}\`);

  if (!customerName || !customerPhone) fail("Name and phone are required");
  if (fulfillment === "delivery" && !address) fail("Delivery needs an address");

  const branch = await db.branch.findFirst({ where: { id: branchId, deletedAt: null, active: true } });
  if (!branch) fail("Pick a branch");

  // ── ხაზები ფორმიდან ──
  const products = await db.product.findMany({
    where: { deletedAt: null, active: true },
    select: { id: true, type: true, legacyId: true },
  });

  const lines: CartLineIn[] = [];

  for (const p of products) {
    const raw = fd.get(\`qty_\${p.id}\`);
    const qty = Number(String(raw ?? "").trim());
    if (!Number.isFinite(qty) || qty <= 0) continue;

    if (p.type === "pizza" && p.legacyId != null) {
      const sizeIdx = Number(fd.get(\`size_\${p.id}\`) ?? 1);
      lines.push({
        kind: "pizza",
        qty: Math.floor(qty),
        pizzaId: p.legacyId,
        sizeIdx: Number.isFinite(sizeIdx) ? sizeIdx : 1,
        // საიტი ნაგულისხმევ პიცაზე ცარიელ ტოპინგებს აგზავნის — იგივე აქაც,
        // რომ ფასი ზუსტად დაემთხვეს
        toppings: {},
        removed: {},
      });
    } else {
      lines.push({
        kind: "simple",
        qty: Math.floor(qty),
        itemId: p.id.replace(/^(side|drink)-/, ""),
      });
    }
  }

  if (lines.length === 0) fail("Add at least one item");

  // ── ფასი სერვერზე ──
  const menu = await getMenu();
  const priced = priceOrder(menu, lines, fulfillment);

  if (priced.errors.length > 0) {
    console.error("manual order: pricing failed", priced.errors);
    fail("Some items are no longer on the menu");
  }

  const org = await db.organization.findFirst();
  if (!org) throw new Error("Organization not found");

  const order = await db.order.create({
    data: {
      source: "phone",
      orgId: org.id,
      branchId: branch!.id,
      fulfillmentType: fulfillment === "pickup" ? "pickup" : "delivery",
      address: fulfillment === "delivery" ? { text: address } : undefined,
      customerName,
      customerPhone,
      notes: notes || null,
      subtotal: priced.subtotal,
      deliveryFee: priced.deliveryFee,
      total: priced.total,
      status: "confirmed", // ხელით შეყვანილი უკვე დადასტურებულია
      statusHistory: [
        { status: "new", at: new Date().toISOString(), by: session.name ?? "admin" },
        { status: "confirmed", at: new Date().toISOString(), by: session.name ?? "admin" },
      ],
      paymentMethod: "cash",
      paymentStatus: "unpaid",
      items: {
        create: priced.items.map((i) => ({
          kind: i.kind,
          productId: i.refId,
          name: { en: i.name, ka: i.name },
          config: i.config as object,
          qty: i.qty,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
      },
    },
    select: { id: true, orderNo: true },
  });

  // ── მარაგის ჩამოწერა — იგივე, რაც საიტზე ──
  try {
    const loc = await locationForBranch(branch!.id);
    if (loc) {
      const used = await computeConsumption(priced.items);
      if (used.length > 0) {
        const created = await recordMovements(
          used.map((u) => ({
            locationId: loc.id,
            itemId: u.itemId,
            type: "sale" as const,
            qty: -u.qty,
            refType: "Order",
            refId: order.id,
            note: \`Order #\${order.orderNo} (manual)\`,
            employeeId: session.sub,
          })),
        );
        for (const [i, m] of created.entries()) {
          await applyOutgoingCost(loc.id, used[i].itemId, used[i].qty, m.id);
        }
      }
    }
  } catch (e) {
    console.error("manual order: stock deduction failed (order kept)", e);
  }

  await logAction({
    action: "order.manual",
    entityType: "Order",
    entityId: order.id,
    branchId: branch!.id,
    after: { orderNo: order.orderNo, total: priced.total, items: priced.items.length },
    employeeId: session.sub,
  });

  revalidatePath("/admin/orders");
  redirect(\`/admin/orders/\${order.id}\`);
}
`;

    // productId უნდა არსებობდეს — refId ყოველთვის ვალიდური არაა
    s = s.replace(
      "          productId: i.refId,",
      "          productId: i.refId,",
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/orders/actions.ts");
  }
}

// ── 2) ღილაკი სიაში ──
{
  const F = "app/admin/orders/page.tsx";
  let s = readFileSync(F, "utf8");

  if (s.includes("/admin/orders/new")) {
    skip.push("orders/page");
  } else {
    copyFileSync(F, F + ".bak");

    const old = `      <div className="admin-head">
        <div>
          <h1>შეკვეთები</h1>`;
    const neu = `      <div className="admin-head">
        <div>
          <h1>შეკვეთები</h1>`;

    // ჰედერს ვამატებთ ღილაკს — სტრუქტურის მიუხედავად
    const m = s.match(/(<div className="admin-head">[\s\S]*?<\/div>)\n(\s*)<\/div>/);
    if (!m) {
      console.error("⚠ ვერ ვიპოვე ჰედერი — ღილაკი ხელით დაამატე");
    } else {
      s = s.replace(
        m[0],
        `${m[1]}\n${m[2]}  <Link className="btn" href="/admin/orders/new">\n${m[2]}    + New order\n${m[2]}  </Link>\n${m[2]}</div>`,
      );
      writeFileSync(F, s);
      console.log("✓ app/admin/orders/page.tsx");
    }
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
