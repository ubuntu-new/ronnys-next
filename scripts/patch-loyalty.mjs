// scripts/patch-loyalty.mjs
//
// ქულების დარიცხვა ყველა არხზე + გამოყენება POS-ზე + გაუქმებისას დაბრუნება.
//
// ⚠️ დარიცხვა შეკვეთას არასდროს აჩერებს — try/catch-შია. გაყიდვა
//    უფრო მნიშვნელოვანია, ვიდრე ქულა.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) POS orders — გამოყენება + დარიცხვა ──
{
  const F = "app/api/pos/orders/route.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("awardPoints")) {
    skip.push("pos/orders");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { logAction } from "@/lib/audit";',
      'import { logAction } from "@/lib/audit";\nimport { getLoyaltySettings, redeemValue, awardPoints, redeemPoints } from "@/lib/loyalty";',
    );

    s = s.replace(
      "    userId?: string;",
      "    userId?: string;\n    redeemPoints?: number;",
    );

    // ქულების გამოთვლა ჩაწერამდე
    s = s.replace(
      "  const org = await db.organization.findFirst();",
      `  // ── ქულების გამოყენება ──
  // მხოლოდ ცნობილ კლიენტს და მხოლოდ იმდენით, რამდენიც ანგარიშზე აქვს.
  let redeem = { points: 0, value: 0 };
  if (body.userId && Number(body.redeemPoints) > 0) {
    const [user, ls] = await Promise.all([
      db.user.findUnique({ where: { id: body.userId }, select: { loyaltyPoints: true } }),
      getLoyaltySettings(),
    ]);
    if (user && ls.enabled) {
      const asked = Math.min(Number(body.redeemPoints), user.loyaltyPoints);
      redeem = redeemValue(asked, ls, priced.subtotal);
    }
  }

  const finalTotal = Math.round((priced.total - redeem.value) * 100) / 100;

  const org = await db.organization.findFirst();`,
    );

    s = s.replace(
      "        subtotal: priced.subtotal,\n        deliveryFee: priced.deliveryFee,\n        total: priced.total,",
      `        subtotal: priced.subtotal,
        deliveryFee: priced.deliveryFee,
        total: finalTotal,
        pointsRedeemed: redeem.points,
        pointsValue: redeem.value,
        discountTotal: redeem.value,
        discountBreakdown: redeem.points > 0 ? [{ type: "points", amount: redeem.value }] : [],`,
    );

    // დარიცხვა/ჩამოჭრა შექმნის შემდეგ
    s = s.replace(
      "    // ── stock, same as every other channel ──",
      `    // ── loyalty ──
    // Never blocks the sale: a lost point is cheaper than a lost order.
    if (body.userId) {
      try {
        if (redeem.points > 0) {
          await redeemPoints({ userId: body.userId, orderId: order.id, points: redeem.points, value: redeem.value });
        }
        const earned = await awardPoints({
          userId: body.userId,
          orderId: order.id,
          subtotal: priced.subtotal,
          redeemedValue: redeem.value,
        });
        if (earned > 0) {
          await db.order.update({ where: { id: order.id }, data: { pointsEarned: earned } });
        }
      } catch (e) {
        console.error("pos: loyalty failed (order kept)", e);
      }
    }

    // ── stock, same as every other channel ──`,
    );

    writeFileSync(F, s);
    console.log("✓ app/api/pos/orders/route.ts");
  }
}

// ── 2) void — ქულების დაბრუნება ──
{
  const F = "app/api/pos/void/route.ts";
  let s = readFileSync(F, "utf8");

  if (s.includes("reversePoints")) {
    skip.push("pos/void");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { logAction } from "@/lib/audit";',
      'import { logAction } from "@/lib/audit";\nimport { reversePoints } from "@/lib/loyalty";',
    );

    s = s.replace(
      "  const history = Array.isArray(order.statusHistory)",
      `  // points go back too — earned and redeemed alike
  try {
    await reversePoints(order.id);
  } catch (e) {
    console.error("void: points reversal failed", e);
  }

  const history = Array.isArray(order.statusHistory)`,
    );

    writeFileSync(F, s);
    console.log("✓ app/api/pos/void/route.ts");
  }
}

// ── 3) საიტის შეკვეთა — დარიცხვა ──
{
  const F = "app/api/orders/route.ts";
  let s = readFileSync(F, "utf8");

  if (s.includes("awardPoints")) {
    skip.push("api/orders");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { notifyNewOrder } from "@/lib/telegram";',
      'import { notifyNewOrder } from "@/lib/telegram";\nimport { awardPoints } from "@/lib/loyalty";\nimport { normalizePhone } from "@/lib/phone";',
    );

    s = s.replace(
      "    // ── Telegram (ფონურად — პასუხს არ ვაყოვნებთ) ──",
      `    // ── loyalty ──
    // The website has no accounts yet, so the phone identifies the customer.
    // Same key as the till, so a phone order and a web order are one person.
    try {
      const key = normalizePhone(phone);
      if (key) {
        const user = await db.user.upsert({
          where: { phone: key },
          update: { name: name || undefined },
          create: { phone: key, name: name || null },
          select: { id: true },
        });
        await db.order.update({
          where: { id: order.id },
          data: { userId: user.id },
        });
        const earned = await awardPoints({
          userId: user.id,
          orderId: order.id,
          subtotal: priced.subtotal,
        });
        if (earned > 0) {
          await db.order.update({ where: { id: order.id }, data: { pointsEarned: earned } });
        }
        await db.user.update({
          where: { id: user.id },
          data: {
            orderCount: { increment: 1 },
            totalSpent: { increment: priced.total },
            lastOrderAt: new Date(),
          },
        });
      }
    } catch (e) {
      console.error("order: loyalty failed (order kept)", e);
    }

    // ── Telegram (ფონურად — პასუხს არ ვაყოვნებთ) ──`,
    );

    writeFileSync(F, s);
    console.log("✓ app/api/orders/route.ts");
  }
}

// ── 4) POS UI — ქულების ღილაკი ──
{
  const F = "app/pos/PosTerminal.tsx";
  let s = readFileSync(F, "utf8");

  if (s.includes("usePoints")) {
    skip.push("PosTerminal");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      "  const [addrId, setAddrId] = useState<string | null>(null);",
      "  const [addrId, setAddrId] = useState<string | null>(null);\n  const [usePoints, setUsePoints] = useState(false);",
    );

    // ჩეკის გასუფთავებისას
    s = s.replace(
      "    setKnown(null);\n    setAddrId(null);",
      "    setKnown(null);\n    setAddrId(null);\n    setUsePoints(false);",
    );

    // payload
    s = s.replace(
      "      userId: known?.id,",
      "      userId: known?.id,\n      redeemPoints: usePoints && known ? known.points : 0,",
    );

    // ღილაკი ჯამთან
    s = s.replace(
      `            <div className="pos-total">
              <span>{count} items</span>
              <b>{money(subtotal)} ₾</b>
            </div>`,
      `            {known && known.points >= 100 && (
              <button
                type="button"
                className={\`pos-points\${usePoints ? " on" : ""}\`}
                onClick={() => setUsePoints((v) => !v)}
              >
                {usePoints ? "✓ " : ""}Use {known.points} points
                <em>−{money(Math.min(known.points * 0.1, subtotal))} ₾</em>
              </button>
            )}

            <div className="pos-total">
              <span>{count} items</span>
              <b>
                {usePoints && known
                  ? money(Math.max(0, subtotal - Math.min(known.points * 0.1, subtotal)))
                  : money(subtotal)}{" "}
                ₾
              </b>
            </div>`,
    );

    writeFileSync(F, s);
    console.log("✓ app/pos/PosTerminal.tsx");
  }
}

// ── 5) სტილი ──
{
  const F = "app/pos/pos.css";
  let css = readFileSync(F, "utf8");

  if (css.includes(".pos-points")) {
    skip.push("pos.css");
  } else {
    css += `

/* ── loyalty ── */
.pos-points {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 14px;
  font: inherit;
  font-size: 14px;
  border: 1px solid var(--p-line);
  background: #fff;
  border-radius: 10px;
  cursor: pointer;
}
.pos-points.on { background: #e8f2e8; border-color: #bcdcbc; color: var(--p-ok); }
.pos-points em { font-style: normal; font-weight: 600; }
`;
    writeFileSync(F, css);
    console.log("✓ app/pos/pos.css");
  }
}

// ── 6) ნავიგაცია ──
{
  const F = "app/admin/layout.tsx";
  let s = readFileSync(F, "utf8");
  if (s.includes("/admin/customers")) {
    skip.push("ნავიგაცია");
  } else {
    s = s.replace(
      '  { href: "/admin/orders", label: "Orders" },',
      '  { href: "/admin/orders", label: "Orders" },\n  { href: "/admin/customers", label: "Customers" },',
    );
    writeFileSync(F, s);
    console.log("✓ ნავიგაცია");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
