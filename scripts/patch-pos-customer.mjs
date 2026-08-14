// scripts/patch-pos-customer.mjs
//
// კლიენტი POS-ში: ტელეფონით ძებნა → არსებული ან ახლის შექმნა →
// შენახული მისამართის არჩევა → შეკვეთა კლიენტზე მიება.
//
// ⚠️ აქამდე სახელი და ტელეფონი უბრალო ტექსტად იწერებოდა შეკვეთაზე.
// ანუ ერთი და იგივე კლიენტი ყოველ ჯერზე ახლიდან ჩნდებოდა და
// „ვინ არის ჩვენი მუდმივი" ვერასდროს გავიგებდით.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) POS order route — userId მიბმა ──
{
  const F = "app/api/pos/orders/route.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("userId")) {
    skip.push("pos/orders");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      "    customerName?: string;",
      "    userId?: string;\n    customerName?: string;",
    );

    s = s.replace(
      "        customerName: body.customerName?.trim() || null,",
      "        userId: body.userId || null,\n        customerName: body.customerName?.trim() || null,",
    );

    // მუდმივი კლიენტის მრიცხველები
    s = s.replace(
      "    await logAction({\n      action: \"order.pos\",",
      `    // მუდმივი კლიენტის სტატისტიკა — ამის გარეშე „ვინ არის ჩვენი
    // მუდმივი კლიენტი" კითხვას პასუხი არ აქვს
    if (body.userId) {
      try {
        await db.user.update({
          where: { id: body.userId },
          data: {
            orderCount: { increment: 1 },
            totalSpent: { increment: priced.total },
            lastOrderAt: new Date(),
          },
        });
      } catch (e) {
        console.error("pos: customer stats update failed (order kept)", e);
      }
    }

    await logAction({
      action: "order.pos",`,
    );

    if (!s.includes("userId: body.userId")) {
      console.error("⚠ ვერ ჩავამატე userId — ხელით შეამოწმე");
      process.exit(1);
    }

    writeFileSync(F, s);
    console.log("✓ app/api/pos/orders/route.ts");
  }
}

// ── 2) PosTerminal — კლიენტის პანელი ──
{
  const F = "app/pos/PosTerminal.tsx";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("lookupCustomer")) {
    skip.push("PosTerminal");
  } else {
    copyFileSync(F, F + ".bak");

    // ── ტიპი ──
    s = s.replace(
      "interface Held { id: string; label: string; lines: Line[]; at: number }",
      `interface CustomerAddress { id: string; title: string | null; line: string; note: string | null; isDefault: boolean }
interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  points: number;
  orders: number;
  addresses: CustomerAddress[];
}

interface Held { id: string; label: string; lines: Line[]; at: number }`,
    );

    // ── state ──
    s = s.replace(
      '  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", notes: "" });',
      `  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", notes: "" });
  const [known, setKnown] = useState<Customer | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [addrId, setAddrId] = useState<string | null>(null);`,
    );

    // ── lookup ──
    s = s.replace(
      "  const signOut = async () => {",
      `  /**
   * Phone is the key: one person, one record. Typed number → normalised →
   * either the customer is already here with their addresses and points, or
   * we create them on the spot.
   */
  const lookupCustomer = async () => {
    const phone = customer.phone.trim();
    if (phone.replace(/\\D/g, "").length < 6) return;

    setLookingUp(true);
    setError(null);
    try {
      const res = await fetch(\`/api/pos/customers?phone=\${encodeURIComponent(phone)}\`);
      const data = await res.json();
      if (data.customer) {
        setKnown(data.customer);
        setCustomer((c) => ({ ...c, name: data.customer.name ?? c.name }));
        const def = data.customer.addresses.find((a: CustomerAddress) => a.isDefault) ?? data.customer.addresses[0];
        if (def) {
          setAddrId(def.id);
          setCustomer((c) => ({ ...c, address: def.line }));
        }
      } else {
        setKnown(null);
        setAddrId(null);
      }
    } catch {
      setError("Could not look up the customer");
    } finally {
      setLookingUp(false);
    }
  };

  const saveCustomer = async () => {
    const phone = customer.phone.trim();
    if (phone.replace(/\\D/g, "").length < 6) { setError("Enter a phone number"); return; }

    setLookingUp(true);
    setError(null);
    try {
      const res = await fetch("/api/pos/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name: customer.name,
          address:
            fulfillment === "delivery" && customer.address.trim() && !addrId
              ? { street: customer.address.trim() }
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not save the customer"); return; }
      setKnown(data.customer);
      const def = data.customer?.addresses?.[0];
      if (def && !addrId) { setAddrId(def.id); setCustomer((c) => ({ ...c, address: def.line })); }
    } catch {
      setError("Could not save the customer");
    } finally {
      setLookingUp(false);
    }
  };

  const signOut = async () => {`,
    );

    // ── clearTicket ──
    s = s.replace(
      `    setCustomer({ name: "", phone: "", address: "", notes: "" });
    setTendered("");`,
      `    setCustomer({ name: "", phone: "", address: "", notes: "" });
    setKnown(null);
    setAddrId(null);
    setTendered("");`,
    );

    // ── payload ──
    s = s.replace(
      "      customerName: customer.name,",
      "      userId: known?.id,\n      customerName: customer.name,",
    );

    // ── UI ──
    const oldPanel = `          {(fulfillment === "delivery" || customer.name || showCustomer) && (
            <div className="pos-customer">
              <input placeholder="Customer name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              <input placeholder="Phone" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              {fulfillment === "delivery" && (
                <input placeholder="Address" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
              )}
              <input placeholder="Order note" value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} />
            </div>
          )}`;

    const newPanel = `          {(fulfillment === "delivery" || customer.name || customer.phone || showCustomer) && (
            <div className="pos-customer">
              <div className="pos-phone-row">
                <input
                  placeholder="Phone — the customer key"
                  inputMode="tel"
                  value={customer.phone}
                  onChange={(e) => { setCustomer({ ...customer, phone: e.target.value }); setKnown(null); setAddrId(null); }}
                  onBlur={lookupCustomer}
                  onKeyDown={(e) => e.key === "Enter" && lookupCustomer()}
                />
                <button type="button" onClick={lookupCustomer} disabled={lookingUp}>
                  {lookingUp ? "…" : "Find"}
                </button>
              </div>

              {known ? (
                <div className="pos-known">
                  <b>{known.name ?? "No name"}</b>
                  <span>
                    {known.orders} orders
                    {known.points > 0 && \` · \${known.points} pts\`}
                  </span>
                </div>
              ) : (
                customer.phone.replace(/\\D/g, "").length >= 6 && (
                  <div className="pos-new-customer">
                    New customer — will be created on save
                  </div>
                )
              )}

              <input
                placeholder="Customer name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />

              {fulfillment === "delivery" && (
                <>
                  {known && known.addresses.length > 0 && (
                    <select
                      value={addrId ?? ""}
                      onChange={(e) => {
                        const a = known.addresses.find((x) => x.id === e.target.value);
                        setAddrId(a?.id ?? null);
                        setCustomer((c) => ({ ...c, address: a?.line ?? "" }));
                      }}
                    >
                      {known.addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title ? \`\${a.title} — \` : ""}{a.line}
                        </option>
                      ))}
                      <option value="">+ new address</option>
                    </select>
                  )}
                  <input
                    placeholder="Address"
                    value={customer.address}
                    onChange={(e) => { setCustomer({ ...customer, address: e.target.value }); setAddrId(null); }}
                  />
                </>
              )}

              <input placeholder="Order note" value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} />

              <button type="button" className="pos-ghost" onClick={saveCustomer} disabled={lookingUp}>
                {known ? "Update customer" : "Save customer"}
              </button>
            </div>
          )}`;

    if (!s.includes(oldPanel)) {
      console.error("⚠ ვერ ვიპოვე კლიენტის პანელი — ჯერ ronnys-pos-ui.zip დააყენე");
      process.exit(1);
    }
    s = s.replace(oldPanel, newPanel);

    writeFileSync(F, s);
    console.log("✓ app/pos/PosTerminal.tsx");
  }
}

// ── 3) სტილი ──
{
  const F = "app/pos/pos.css";
  let css = readFileSync(F, "utf8");

  if (css.includes(".pos-known")) {
    skip.push("pos.css");
  } else {
    css += `

/* ── customer ── */
.pos-phone-row { display: flex; gap: 6px; }
.pos-phone-row input { flex: 1; }
.pos-phone-row button {
  padding: 10px 14px;
  font: inherit;
  font-size: 14px;
  border: 1px solid var(--p-line);
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
}
.pos-customer select {
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  border: 1px solid var(--p-line);
  border-radius: 8px;
  background: #fff;
}
.pos-known {
  background: #e8f2e8;
  border-radius: 8px;
  padding: 8px 12px;
}
.pos-known b { display: block; font-size: 14px; }
.pos-known span { font-size: 12px; color: var(--p-ok); }
.pos-new-customer {
  background: #fdf3d6;
  color: #8a6a12;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
}
`;
    writeFileSync(F, css);
    console.log("✓ app/pos/pos.css");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
