import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { fmtQty } from "@/lib/stock";
import { addMovement } from "./actions";

export const dynamic = "force-dynamic";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string; saved?: string; low?: string }>;
}) {
  const sp = await searchParams;

  const locations = await db.stockLocation.findMany({
    where: { deletedAt: null },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  const locId = sp.loc || locations[0]?.id || "";
  const location = locations.find((l) => l.id === locId) ?? null;

  const [items, levels] = await Promise.all([
    db.stockItem.findMany({ where: { deletedAt: null, active: true }, orderBy: { category: "asc" } }),
    locId
      ? db.stockLevel.findMany({ where: { locationId: locId }, include: { item: true } })
      : Promise.resolve([]),
  ]);

  const levelOf = new Map(levels.map((l) => [l.itemId, l]));

  const rows = items.map((it) => {
    const l = levelOf.get(it.id);
    const qty = l ? Number(l.qty) : 0;
    const min = l?.minLevel != null ? Number(l.minLevel) : null;
    const target = l?.targetLevel != null ? Number(l.targetLevel) : null;
    const low = min != null && qty <= min;
    const need = low && target != null ? Math.max(0, target - qty) : 0;
    return { it, qty, min, target, low, need };
  });

  const shown = sp.low === "1" ? rows.filter((r) => r.low) : rows;
  const lowCount = rows.filter((r) => r.low).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>მარაგი</h1>
          <p>
            {location ? i18nText(location.name) : "ლოკაცია არ არის"} · {items.length} ერთეული
            {lowCount > 0 && ` · ${lowCount} ამოწურვის ზღვარზე`}
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/stock/movements">
          ჟურნალი
        </Link>
      </div>

      {sp.saved && <div className="alert alert-ok">ჩაწერილია.</div>}

      {lowCount > 0 && sp.low !== "1" && (
        <div className="alert" style={{ background: "#fdf3d6", color: "#8a6a12" }}>
          <b>{lowCount} ერთეული მინიმუმზეა ან ქვემოთ.</b>{" "}
          <Link href={`/admin/stock?loc=${locId}&low=1`}>ნახე მხოლოდ ისინი →</Link>
        </div>
      )}

      <div className="admin-panel">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {locations.map((l) => (
            <Link
              key={l.id}
              className={l.id === locId ? "btn" : "btn btn-ghost"}
              href={`/admin/stock?loc=${l.id}`}
            >
              {i18nText(l.name)}
              {l.type === "warehouse" && " ⭐"}
            </Link>
          ))}
          <Link className="btn btn-ghost" href="/admin/stock/items">
            ერთეულების მართვა
          </Link>
        </div>
      </div>

      {locations.length === 0 ? (
        <div className="admin-panel">
          <p className="hint" style={{ margin: 0 }}>
            ლოკაციები ჯერ არ შექმნილა — გაუშვი <code>npx tsx scripts/seed-stock-locations.mjs</code>
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="admin-panel">
          <p className="hint" style={{ marginTop: 0 }}>
            საწყობის ერთეული ჯერ არ არის. დაამატე ის, რასაც ინახავ — მოცარელა (კგ), კოკა-კოლა
            (ცალი), ფქვილი (კგ).
          </p>
          <Link className="btn" href="/admin/stock/items/new">
            + პირველი ერთეული
          </Link>
        </div>
      ) : (
        <>
          <div className="admin-panel">
            <h2>ნაშთები</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ერთეული</th>
                  <th style={{ width: 90 }}>ჯგუფი</th>
                  <th style={{ width: 120 }}>ნაშთი</th>
                  <th style={{ width: 100 }}>მინიმუმი</th>
                  <th style={{ width: 100 }}>სამიზნე</th>
                  <th style={{ width: 150 }}>საჭიროა</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.it.id} style={r.low ? { background: "#fffaf9" } : undefined}>
                    <td>
                      <Link href={`/admin/stock/items/${r.it.id}`}>{i18nText(r.it.name)}</Link>
                      <div className="hint">
                        {r.it.sku ?? ""}
                        {r.it.isProduced && " · იწარმოება"}
                      </div>
                    </td>
                    <td>
                      <span className="hint">{r.it.category ?? "—"}</span>
                    </td>
                    <td>
                      <b style={r.low ? { color: "var(--a-danger)" } : undefined}>
                        {fmtQty(r.qty, r.it.unit)}
                      </b>
                    </td>
                    <td>
                      <span className="hint">{r.min ?? "—"}</span>
                    </td>
                    <td>
                      <span className="hint">{r.target ?? "—"}</span>
                    </td>
                    <td>
                      {r.need > 0 ? (
                        <span className="badge" style={{ background: "#fdf3d6", color: "#8a6a12" }}>
                          +{fmtQty(r.need, r.it.unit)}
                        </span>
                      ) : (
                        <span className="hint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── ხელით მოძრაობა ── */}
          <form className="admin-panel admin-form" action={addMovement} style={{ maxWidth: "none" }}>
            <h2>მოძრაობის დამატება</h2>
            <input type="hidden" name="locationId" value={locId} />

            <div className="field-row" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
              <div className="field">
                <label htmlFor="itemId">ერთეული</label>
                <select id="itemId" name="itemId" required>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {i18nText(it.name)} ({it.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="kind">ტიპი</label>
                <select id="kind" name="kind" defaultValue="receipt">
                  <option value="receipt">მიღება (+)</option>
                  <option value="waste">ჩამოწერა (−)</option>
                  <option value="count">ინვენტარიზაცია</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="qty">რაოდენობა</label>
                <input id="qty" name="qty" type="number" step="0.001" min="0" required />
              </div>
            </div>

            <div className="field-row">
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
            </div>

            <p className="hint" style={{ marginTop: -4 }}>
              <b>მიღება</b> ამატებს · <b>ჩამოწერა</b> აკლებს (მინუსს ავტომატურად ვსვამთ) ·{" "}
              <b>ინვენტარიზაცია</b> — ჩაწერე ფაქტობრივი ნაშთი, სხვაობას სისტემა თვითონ დაითვლის.
            </p>

            <div className="form-actions">
              <button className="btn" type="submit">
                ჩაწერა
              </button>
            </div>
          </form>
        </>
      )}

      <div className="admin-panel">
        <h2>როგორ მუშაობს</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: "var(--a-muted)" }}>
          <li>
            ნაშთი <b>ხელით არასდროს იწერება</b> — ის მოძრაობების ჯამია. ამიტომ ყოველთვის შეიძლება
            კითხვა „რატომ დარჩა ამდენი?“ და პასუხი ჟურნალშია.
          </li>
          <li>
            <b>საწარმოსაც</b> სჭირდება მინიმუმი — თორემ ხუთივე ფილიალი შეავსებს და საწყობი ჩუმად
            დაიცლება.
          </li>
          <li>ავტომატური ჩამოწერა შეკვეთაზე რეცეპტებთან ერთად მოვა (ეტაპი 3B).</li>
        </ul>
      </div>
    </>
  );
}
