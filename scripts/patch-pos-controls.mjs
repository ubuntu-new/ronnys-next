// scripts/patch-pos-controls.mjs
//
//  1. ფილიალის ხელმისაწვდომობა — POS აღარ გაყიდის იმას, რაც ამ ფილიალში გათავდა
//  2. ბოლო შეკვეთები + გაუქმება მენეჯერის PIN-ით
//  3. ეკრანის ჩაკეტვა უმოქმედობისას
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) POS page — ხელმისაწვდომობა ──
{
  const F = "app/pos/page.tsx";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("unavailable")) {
    skip.push("pos/page");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      `  const [session, branches, terminals, menu] = await Promise.all([`,
      `  const [session, branches, terminals, menu] = await Promise.all([`,
    );

    s = s.replace(
      `  return (
    <PosTerminal`,
      `  // ── რა არ იყიდება ამ ფილიალში ──
  // ⚠️ ამის გარეშე მოლარე გაყიდიდა იმას, რაც სწორედ იმ ფილიალში გათავდა.
  // საიტი ამას ითვალისწინებდა, POS — არა.
  let unavailable: number[] = [];
  let unavailableItems: string[] = [];

  if (session?.branchId) {
    const off = await db.branchProduct.findMany({
      where: { branchId: session.branchId, available: false },
      include: { product: { select: { id: true, type: true, legacyId: true } } },
    });
    unavailable = off
      .filter((o) => o.product.type === "pizza" && o.product.legacyId != null)
      .map((o) => o.product.legacyId as number);
    unavailableItems = off
      .filter((o) => o.product.type !== "pizza")
      .map((o) => o.product.id.replace(/^(side|drink)-/, ""));
  }

  return (
    <PosTerminal
      unavailable={unavailable}
      unavailableItems={unavailableItems}`,
    );

    writeFileSync(F, s);
    console.log("✓ app/pos/page.tsx");
  }
}

// ── 2) ტერმინალი ──
{
  const F = "app/pos/PosTerminal.tsx";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("locked")) {
    skip.push("PosTerminal");
  } else {
    copyFileSync(F, F + ".bak");

    // props
    s = s.replace(
      `export default function PosTerminal({
  session,
  menu,
  branches,
  terminals,
}: {
  session: { name: string; branchId: string; posId: string } | null;
  menu: Menu | null;
  branches: { id: string; name: string; code: string }[];
  terminals: { posId: string; branchId: string; label: string }[];
}) {`,
      `export default function PosTerminal({
  session,
  menu,
  branches,
  terminals,
  unavailable = [],
  unavailableItems = [],
}: {
  session: { name: string; branchId: string; posId: string } | null;
  menu: Menu | null;
  branches: { id: string; name: string; code: string }[];
  terminals: { posId: string; branchId: string; label: string }[];
  unavailable?: number[];
  unavailableItems?: string[];
}) {`,
    );

    // state
    s = s.replace(
      "  const [online, setOnline] = useState(true);",
      `  const [online, setOnline] = useState(true);
  const [locked, setLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");
  const [recent, setRecent] = useState<RecentOrder[] | null>(null);
  const [voiding, setVoiding] = useState<RecentOrder | null>(null);
  const [voidPin, setVoidPin] = useState("");
  const [voidReason, setVoidReason] = useState("");`,
    );

    // types
    s = s.replace(
      "interface Queued { clientRef: string; localNo: string; payload: unknown; at: number }",
      `interface RecentOrder {
  id: string;
  no: number;
  status: string;
  total: number;
  at: string;
  customer: string | null;
  items: { name: string; qty: number; detail: string; total: number }[];
}

interface Queued { clientRef: string; localNo: string; payload: unknown; at: number }`,
    );

    // idle lock + recent + void
    s = s.replace(
      "  // ── auth ──",
      `  /**
   * Idle lock.
   *
   * The session lasts a shift, but the terminal stands on a counter all day.
   * Without this, "who sold this" stops meaning anything the moment the
   * cashier steps away — anyone can ring up a sale under their name.
   */
  useEffect(() => {
    if (!signedIn) return;
    let timer: number;

    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setLocked(true), IDLE_MS);
    };

    const events = ["pointerdown", "keydown", "wheel"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [signedIn]);

  const unlock = async () => {
    setError(null);
    try {
      const res = await fetch("/api/pos/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: unlockPin, branchId, posId }),
      });
      if (!res.ok) { setError("PIN not recognised"); setUnlockPin(""); return; }
      setLocked(false);
      setUnlockPin("");
    } catch {
      setError("No connection");
    }
  };

  const loadRecent = async () => {
    try {
      const res = await fetch("/api/pos/recent", { cache: "no-store" });
      const data = await res.json();
      setRecent(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      setRecent([]);
    }
  };

  const doVoid = async () => {
    if (!voiding) return;
    setError(null);
    try {
      const res = await fetch("/api/pos/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: voiding.id, pin: voidPin, reason: voidReason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not void"); return; }
      setVoiding(null);
      setVoidPin("");
      setVoidReason("");
      loadRecent();
    } catch {
      setError("No connection");
    }
  };

  // ── auth ──`,
    );

    // constant
    s = s.replace(
      "const QUICK_CASH = [5, 10, 20, 50, 100];",
      "const QUICK_CASH = [5, 10, 20, 50, 100];\n/** Lock after this long with no interaction. */\nconst IDLE_MS = 3 * 60 * 1000;",
    );

    // tiles filter
    s = s.replace(
      `  const pizzaTiles = menu.PIZZAS
    .filter((p) => !q || p.name.toLowerCase().includes(q))`,
      `  const offPizzas = new Set(unavailable);
  const offItems = new Set(unavailableItems);

  const pizzaTiles = menu.PIZZAS
    .filter((p) => !offPizzas.has(p.id))
    .filter((p) => !q || p.name.toLowerCase().includes(q))`,
    );

    s = s.replace(
      `  const itemTiles = (arr: Item[]) =>
    arr.filter((i) => !q || i.name.toLowerCase().includes(q))`,
      `  const itemTiles = (arr: Item[]) =>
    arr.filter((i) => !offItems.has(i.id))
      .filter((i) => !q || i.name.toLowerCase().includes(q))`,
    );

    // header button
    s = s.replace(
      `          <button type="button" onClick={() => setShowHeld(true)}>
            Held {held.length > 0 && <b>{held.length}</b>}
          </button>`,
      `          <button type="button" onClick={() => { loadRecent(); }}>
            Recent
          </button>
          <button type="button" onClick={() => setShowHeld(true)}>
            Held {held.length > 0 && <b>{held.length}</b>}
          </button>
          <button type="button" onClick={() => setLocked(true)}>Lock</button>`,
    );

    // modals — before the confirmation modal
    s = s.replace(
      `      {/* ── confirmation ── */}`,
      `      {/* ── recent orders ── */}
      {recent !== null && (
        <div className="pos-modal" onClick={(e) => e.target === e.currentTarget && setRecent(null)}>
          <div className="pos-sheet">
            <h2>Recent orders — this terminal</h2>
            {recent.length === 0 && <p className="pos-empty">Nothing yet</p>}
            {recent.map((o) => (
              <div className="pos-recent" key={o.id}>
                <div className="pos-recent-top">
                  <b>#{o.no}</b>
                  <span>{new Date(o.at).toLocaleTimeString("ka-GE")}</span>
                  <b className="pos-recent-total">{money(o.total)} ₾</b>
                </div>
                <div className="pos-recent-items">
                  {o.items.map((it, i) => (
                    <div key={i}>
                      {it.qty}× {it.name}
                      {it.detail && <em> · {it.detail}</em>}
                    </div>
                  ))}
                </div>
                <div className="pos-recent-foot">
                  {o.status === "cancelled" ? (
                    <span className="pos-voided">Voided</span>
                  ) : (
                    <button type="button" onClick={() => { setVoiding(o); setRecent(null); }}>
                      Void
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="pos-sheet-foot">
              <button type="button" onClick={() => setRecent(null)}>Close</button>
              <span />
            </div>
          </div>
        </div>
      )}

      {/* ── void ── */}
      {voiding && (
        <div className="pos-modal" onClick={(e) => e.target === e.currentTarget && setVoiding(null)}>
          <div className="pos-sheet pos-pay">
            <h2>Void order #{voiding.no}</h2>
            <p className="pos-pay-due">Amount <b>{money(voiding.total)} ₾</b></p>

            <label>Reason</label>
            <input
              className="pos-void-input"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Wrong item, customer left…"
            />

            <label>Manager PIN</label>
            <input
              className="pos-void-input"
              type="password"
              inputMode="numeric"
              value={voidPin}
              onChange={(e) => setVoidPin(e.target.value.replace(/\\D/g, "").slice(0, 8))}
              placeholder="••••"
            />

            <p className="pos-fiscal">
              ⚠️ A void needs someone else&apos;s PIN. Both names and the reason are recorded, and
              the stock goes back.
            </p>

            {error && <p className="pos-err">{error}</p>}

            <div className="pos-sheet-foot">
              <button type="button" onClick={() => { setVoiding(null); setError(null); }}>Cancel</button>
              <button className="pos-primary" type="button" onClick={doVoid} disabled={voidReason.trim().length < 3 || voidPin.length < 4}>
                Void order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── idle lock ── */}
      {locked && (
        <div className="pos-lock">
          <div className="pos-lock-box">
            <h2>Locked</h2>
            <p>{posId} · enter your PIN to continue</p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={unlockPin}
              onChange={(e) => setUnlockPin(e.target.value.replace(/\\D/g, "").slice(0, 8))}
              onKeyDown={(e) => e.key === "Enter" && unlock()}
              placeholder="••••"
            />
            <div className="pos-keys">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button key={n} type="button" onClick={() => setUnlockPin((p) => (p + n).slice(0, 8))}>{n}</button>
              ))}
              <button type="button" onClick={() => setUnlockPin("")}>C</button>
              <button type="button" onClick={() => setUnlockPin((p) => (p + "0").slice(0, 8))}>0</button>
              <button type="button" onClick={() => setUnlockPin((p) => p.slice(0, -1))}>←</button>
            </div>
            {error && <p className="pos-err">{error}</p>}
            <button className="pos-primary" type="button" onClick={unlock} disabled={unlockPin.length < 4}>
              Unlock
            </button>
            <p className="pos-lock-note">The ticket is kept — nothing is lost.</p>
          </div>
        </div>
      )}

      {/* ── confirmation ── */}`,
    );

    writeFileSync(F, s);
    console.log("✓ app/pos/PosTerminal.tsx");
  }
}

// ── 3) სტილი ──
{
  const F = "app/pos/pos.css";
  let css = readFileSync(F, "utf8");

  if (css.includes(".pos-lock")) {
    skip.push("pos.css");
  } else {
    css += `

/* ── recent orders ── */
.pos-recent { padding: 12px 0; border-bottom: 1px solid #f2f1ef; }
.pos-recent-top { display: flex; align-items: baseline; gap: 10px; }
.pos-recent-top b { font-size: 16px; }
.pos-recent-top span { font-size: 13px; color: var(--p-muted); }
.pos-recent-total { margin-left: auto; }
.pos-recent-items { font-size: 13px; color: var(--p-muted); margin: 6px 0; line-height: 1.6; }
.pos-recent-items em { font-style: normal; opacity: .8; }
.pos-recent-foot button {
  padding: 7px 14px;
  font: inherit;
  font-size: 13px;
  color: var(--p-danger);
  border: 1px solid #f3d5d2;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
}
.pos-voided { font-size: 13px; color: var(--p-danger); font-weight: 600; }

.pos-void-input {
  width: 100%;
  padding: 14px;
  font: inherit;
  font-size: 17px;
  border: 1px solid var(--p-line);
  border-radius: 10px;
}

/* ── idle lock ── */
.pos-lock {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(28, 25, 23, .96);
  display: grid;
  place-items: center;
  padding: 20px;
}
.pos-lock-box {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
  text-align: center;
}
.pos-lock-box h2 { margin: 0 0 4px; font-size: 22px; }
.pos-lock-box > p { margin: 0 0 16px; font-size: 14px; color: var(--p-muted); }
.pos-lock-box input {
  width: 100%;
  padding: 14px;
  font: inherit;
  font-size: 20px;
  text-align: center;
  letter-spacing: .4em;
  border: 1px solid var(--p-line);
  border-radius: 10px;
}
.pos-lock-box .pos-primary { width: 100%; }
.pos-lock-note { font-size: 12px; color: var(--p-muted); margin: 12px 0 0; }
`;
    writeFileSync(F, css);
    console.log("✓ app/pos/pos.css");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
