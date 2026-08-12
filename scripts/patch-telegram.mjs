// scripts/patch-telegram.mjs
//
//  1. /api/orders — ახალი შეკვეთა → Telegram
//  2. transfers/actions — მოთხოვნა და გაგზავნა → Telegram
//  3. settings — ჩართვა/გამორთვა თითო ტიპზე
//
// ⚠️ ყველგან `void notify…()` — შეტყობინება ფონურია და მთავარ ოპერაციას
//    არ აყოვნებს. ჩავარდნა ლოგშია, მომხმარებელი ვერაფერს ამჩნევს.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) ახალი შეკვეთა ──
{
  const F = "app/api/orders/route.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("notifyNewOrder")) {
    skip.push("api/orders");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { recordMovements } from "@/lib/stock";',
      'import { recordMovements } from "@/lib/stock";\nimport { notifyNewOrder } from "@/lib/telegram";',
    );

    s = s.replace(
      "    // ── მარაგის ჩამოწერა ──",
      `    // ── Telegram (ფონურად — პასუხს არ ვაყოვნებთ) ──
    void notifyNewOrder({
      orderNo: order.orderNo,
      branch: String((branch.name as Record<string, unknown>)?.ka ?? (branch.name as Record<string, unknown>)?.en ?? ""),
      total: Number(order.total).toFixed(2),
      itemCount: priced.items.length,
      type: fulfillment,
      customer: name,
      phone,
    });

    // ── მარაგის ჩამოწერა ──`,
    );

    writeFileSync(F, s);
    console.log("✓ app/api/orders/route.ts");
  }
}

// ── 2) გადატანები ──
{
  const F = "app/admin/stock/transfers/actions.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("notifyTransferRequest")) {
    skip.push("transfers");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      'import { logAction } from "@/lib/audit";',
      'import { logAction } from "@/lib/audit";\nimport { notifyTransferRequest, notifyTransferSent } from "@/lib/telegram";',
    );

    // მოთხოვნა
    s = s.replace(
      `  revalidatePath("/admin/stock/transfers");
  redirect(\`/admin/stock/transfers/\${t.id}\`);`,
      `  const locs = await db.stockLocation.findMany({
    where: { id: { in: [fromLocationId, toLocationId] } },
    select: { id: true, name: true },
  });
  const nm = (id: string) => {
    const n = locs.find((l) => l.id === id)?.name as Record<string, unknown> | undefined;
    return String(n?.ka ?? n?.en ?? "");
  };

  void notifyTransferRequest({
    no: t.no,
    from: nm(fromLocationId),
    to: nm(toLocationId),
    lines: lines.length,
    by: s.name,
  });

  revalidatePath("/admin/stock/transfers");
  redirect(\`/admin/stock/transfers/\${t.id}\`);`,
    );

    // გაგზავნა
    s = s.replace(
      `  revalidatePath("/admin/stock");
  revalidatePath("/admin/stock/transfers");
  redirect(\`/admin/stock/transfers/\${id}?ok=sent\`);`,
      `  const full = await db.transfer.findUnique({
    where: { id },
    select: { from: { select: { name: true } }, to: { select: { name: true } } },
  });
  const label = (n: unknown) => {
    const o = n as Record<string, unknown> | undefined;
    return String(o?.ka ?? o?.en ?? "");
  };

  void notifyTransferSent({
    no: t.no,
    from: label(full?.from.name),
    to: label(full?.to.name),
    by: s.name,
  });

  revalidatePath("/admin/stock");
  revalidatePath("/admin/stock/transfers");
  redirect(\`/admin/stock/transfers/\${id}?ok=sent\`);`,
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/stock/transfers/actions.ts");
  }
}

// ── 3) settings ──
{
  const A = "app/admin/settings/actions.ts";
  let a = readFileSync(A, "utf8");

  if (a.includes("saveTelegram")) {
    skip.push("settings/actions");
  } else {
    copyFileSync(A, A + ".bak");

    a += `
export async function saveTelegram(fd: FormData) {
  const s = await requirePermission("can_edit_menu");
  await put(
    "telegram",
    {
      enabled: fdBool(fd, "enabled"),
      chatId: fdStr(fd, "chatId"),
      events: {
        order: fdBool(fd, "ev_order"),
        transferRequest: fdBool(fd, "ev_transferRequest"),
        transferSent: fdBool(fd, "ev_transferSent"),
        lowStock: fdBool(fd, "ev_lowStock"),
      },
    },
    s.sub,
  );
  redirect("/admin/settings?saved=telegram");
}
`;
    writeFileSync(A, a);
    console.log("✓ app/admin/settings/actions.ts");
  }

  const P = "app/admin/settings/page.tsx";
  let p = readFileSync(P, "utf8");

  if (p.includes("saveTelegram")) {
    skip.push("settings/page");
  } else {
    copyFileSync(P, P + ".bak");

    p = p.replace("  saveSocial,\n} from \"./actions\";", "  saveSocial,\n  saveTelegram,\n} from \"./actions\";");
    p = p.replace("  const social = Array.isArray(map.social)", "  const tg = obj(map.telegram);\n  const tgEvents = obj(tg.events);\n  const social = Array.isArray(map.social)");

    p = p.replace(
      "      {/* ── სოც. ქსელები ── */}",
      `      {/* ── Telegram ── */}
      <form className="admin-panel admin-form" action={saveTelegram} style={{ maxWidth: "none" }}>
        <h2>Telegram შეტყობინებები</h2>
        <p className="hint" style={{ marginTop: -8 }}>
          ბოტის ტოკენი <code>.env</code>-შია (<code>TELEGRAM_BOT_TOKEN</code>) — აქ არ ჩანს.
        </p>

        <div className="field-check">
          <input id="tg_enabled" name="enabled" type="checkbox" defaultChecked={b(tg.enabled, false)} />
          <label htmlFor="tg_enabled">ჩართულია</label>
        </div>

        <div className="field">
          <label htmlFor="chatId">Chat ID</label>
          <input id="chatId" name="chatId" type="text" defaultValue={String(tg.chatId ?? "")} placeholder="-1001234567890" />
          <span className="hint">ჯგუფის id მინუსით იწყება, პირადი ჩატისა — არა.</span>
        </div>

        <div className="field">
          <label>რაზე მოვიდეს</label>
          <div className="field-check">
            <input id="ev_order" name="ev_order" type="checkbox" defaultChecked={b(tgEvents.order, true)} />
            <label htmlFor="ev_order">🍕 ახალი შეკვეთა</label>
          </div>
          <div className="field-check">
            <input id="ev_transferRequest" name="ev_transferRequest" type="checkbox" defaultChecked={b(tgEvents.transferRequest, true)} />
            <label htmlFor="ev_transferRequest">📦 შევსების მოთხოვნა (დასამტკიცებელი)</label>
          </div>
          <div className="field-check">
            <input id="ev_transferSent" name="ev_transferSent" type="checkbox" defaultChecked={b(tgEvents.transferSent, true)} />
            <label htmlFor="ev_transferSent">🚚 გზავნილი გამოვიდა</label>
          </div>
          <div className="field-check">
            <input id="ev_lowStock" name="ev_lowStock" type="checkbox" defaultChecked={b(tgEvents.lowStock, true)} />
            <label htmlFor="ev_lowStock">⚠️ მარაგი ზღვარზე (დღიური შეჯამება)</label>
          </div>
          <span className="hint">
            გამორთე ის, რაც ხმაურია — ცოტა და საჭირო შეტყობინება ჯობია ბევრს და უგულებელყოფილს.
          </span>
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">შენახვა</button>
        </div>
      </form>

      {/* ── სოც. ქსელები ── */}`,
    );

    writeFileSync(P, p);
    console.log("✓ app/admin/settings/page.tsx");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
