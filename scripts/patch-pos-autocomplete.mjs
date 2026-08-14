// scripts/patch-pos-autocomplete.mjs
//
// ავტოშევსება კლიენტის ძებნაში — 3 სიმბოლოდან.
//
//  1. /api/pos/customers — `q` პარამეტრი: ნაწილობრივი ძებნა ნომრითა და სახელით
//  2. PosTerminal — ჩამოსაშლელი სია, 250მწ დაყოვნებით
//
// ⚠️ დაყოვნება საჭიროა: ყოველ ასოზე მოთხოვნა სალაროს ქსელს ტვირთავს
//    და შედეგები არეულად ბრუნდება (ბოლო აკრეფილი ყოველთვის ბოლო არ მოდის).
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) API ──
{
  const F = "app/api/pos/customers/route.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("searchParams.get(\"q\")")) {
    skip.push("API");
  } else {
    copyFileSync(F, F + ".bak");

    const old = `  const raw = new URL(req.url).searchParams.get("phone") ?? "";
  const phone = normalizePhone(raw);
  if (!phone) return NextResponse.json({ customer: null });`;

    const neu = `  const params = new URL(req.url).searchParams;

  // ── ავტოშევსება: ნაწილობრივი ძებნა ნომრითა და სახელით ──
  const q = (params.get("q") ?? "").trim();
  if (q) {
    if (q.length < 3) return NextResponse.json({ results: [] });

    const digits = q.replace(/\\D/g, "");
    // "599" უნდა იპოვოს "995599123456" — ამიტომ contains, არა startsWith
    const where = digits.length >= 3
      ? { OR: [{ phone: { contains: digits } }, { name: { contains: q, mode: "insensitive" as const } }] }
      : { name: { contains: q, mode: "insensitive" as const } };

    const found = await db.user.findMany({
      where,
      include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] } },
      // მუდმივი კლიენტები ზემოთ — მათ უფრო ხშირად ეძებენ
      orderBy: [{ orderCount: "desc" }, { lastOrderAt: "desc" }],
      take: 8,
    });

    return NextResponse.json({ results: found.map(shape) });
  }

  const raw = params.get("phone") ?? "";
  const phone = normalizePhone(raw);
  if (!phone) return NextResponse.json({ customer: null });`;

    if (!s.includes(old)) {
      console.error("⚠ ვერ ვიპოვე GET-ის ბლოკი");
      process.exit(1);
    }
    s = s.replace(old, neu);

    writeFileSync(F, s);
    console.log("✓ app/api/pos/customers/route.ts");
  }
}

// ── 2) ტერმინალი ──
{
  const F = "app/pos/PosTerminal.tsx";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("suggestions")) {
    skip.push("PosTerminal");
  } else {
    copyFileSync(F, F + ".bak");

    // state
    s = s.replace(
      "  const [addrId, setAddrId] = useState<string | null>(null);",
      `  const [addrId, setAddrId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSug, setShowSug] = useState(false);`,
    );

    // debounce
    s = s.replace(
      "  const persistQueue = useCallback((q: Queued[]) => {",
      `  /**
   * Autocomplete from 3 characters.
   *
   * The 250ms delay is not cosmetic: firing on every keystroke floods a till's
   * connection and answers arrive out of order, so the last thing typed isn't
   * the last thing shown. \`cancelled\` drops any reply that a newer query has
   * already superseded.
   */
  useEffect(() => {
    const q = customer.phone.trim();
    if (q.length < 3) { setSuggestions([]); return; }

    let cancelled = false;
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(\`/api/pos/customers?q=\${encodeURIComponent(q)}\`);
        const data = await res.json();
        if (!cancelled) {
          setSuggestions(Array.isArray(data.results) ? data.results : []);
          setShowSug(true);
        }
      } catch {
        /* silent — autocomplete is a convenience, not a requirement */
      }
    }, 250);

    return () => { cancelled = true; window.clearTimeout(id); };
  }, [customer.phone]);

  const pickCustomer = useCallback((c: Customer) => {
    setKnown(c);
    setShowSug(false);
    setSuggestions([]);
    const def = c.addresses.find((a) => a.isDefault) ?? c.addresses[0];
    setAddrId(def?.id ?? null);
    setCustomer((cur) => ({
      ...cur,
      name: c.name ?? cur.name,
      phone: c.phone ?? cur.phone,
      address: def?.line ?? cur.address,
    }));
  }, []);

  const persistQueue = useCallback((q: Queued[]) => {`,
    );

    // UI
    const old = `                <input
                  placeholder="Phone — the customer key"
                  inputMode="tel"
                  value={customer.phone}
                  onChange={(e) => { setCustomer({ ...customer, phone: e.target.value }); setKnown(null); setAddrId(null); }}
                  onBlur={lookupCustomer}
                  onKeyDown={(e) => e.key === "Enter" && lookupCustomer()}
                />
                <button type="button" onClick={lookupCustomer} disabled={lookingUp}>
                  {lookingUp ? "…" : "Find"}
                </button>`;

    const neu = `                <div className="pos-sug-wrap">
                  <input
                    placeholder="Phone or name — from 3 characters"
                    value={customer.phone}
                    onChange={(e) => { setCustomer({ ...customer, phone: e.target.value }); setKnown(null); setAddrId(null); }}
                    onFocus={() => suggestions.length > 0 && setShowSug(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { setShowSug(false); lookupCustomer(); }
                      if (e.key === "Escape") setShowSug(false);
                    }}
                  />
                  {showSug && suggestions.length > 0 && (
                    <ul className="pos-sug">
                      {suggestions.map((c) => (
                        <li key={c.id}>
                          <button type="button" onClick={() => pickCustomer(c)}>
                            <b>{c.name ?? "No name"}</b>
                            <span>{c.phone}</span>
                            <i>{c.orders} orders{c.points > 0 && \` · \${c.points} pts\`}</i>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button type="button" onClick={() => { setShowSug(false); lookupCustomer(); }} disabled={lookingUp}>
                  {lookingUp ? "…" : "Find"}
                </button>`;

    if (!s.includes(old)) {
      console.error("⚠ ვერ ვიპოვე ტელეფონის ველი — ჯერ ronnys-pos-customers.zip დააყენე");
      process.exit(1);
    }
    s = s.replace(old, neu);

    writeFileSync(F, s);
    console.log("✓ app/pos/PosTerminal.tsx");
  }
}

// ── 3) სტილი ──
{
  const F = "app/pos/pos.css";
  let css = readFileSync(F, "utf8");

  if (css.includes(".pos-sug")) {
    skip.push("pos.css");
  } else {
    css += `

/* ── customer autocomplete ── */
.pos-sug-wrap { position: relative; flex: 1; }
.pos-sug-wrap input { width: 100%; }
.pos-sug {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  margin: 0;
  padding: 0;
  list-style: none;
  background: #fff;
  border: 1px solid var(--p-line);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .12);
  max-height: 280px;
  overflow-y: auto;
}
.pos-sug li { border-bottom: 1px solid #f2f1ef; }
.pos-sug li:last-child { border-bottom: 0; }
.pos-sug button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}
.pos-sug button:hover { background: #faf9f7; }
.pos-sug b { display: block; font-size: 14px; }
.pos-sug span { font-size: 13px; color: var(--p-muted); }
.pos-sug i { display: block; font-style: normal; font-size: 12px; color: var(--p-ok); }
`;
    writeFileSync(F, css);
    console.log("✓ app/pos/pos.css");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
