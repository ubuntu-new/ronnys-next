import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { addRule, saveRules } from "./actions";

export const dynamic = "force-dynamic";

const inp: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--a-line)",
  borderRadius: 6,
  font: "inherit",
};

export default async function ConsumptionPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; owner?: string }>;
}) {
  const sp = await searchParams;

  const [items, products, toppings, rules] = await Promise.all([
    db.stockItem.findMany({ where: { deletedAt: null, active: true }, orderBy: { category: "asc" } }),
    db.product.findMany({
      where: { deletedAt: null },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
      include: { category: true },
    }),
    db.topping.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    db.consumptionRule.findMany({ include: { item: true, product: true, topping: true } }),
  ]);

  const productRules = rules.filter((r) => r.productId);
  const toppingRules = rules.filter((r) => r.toppingId);

  const withRules = new Set([
    ...productRules.map((r) => r.productId!),
    ...toppingRules.map((r) => r.toppingId!),
  ]);

  const covered = products.filter((p) => withRules.has(p.id)).length;
  const coveredT = toppings.filter((t) => withRules.has(t.id)).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ხარჯვის წესები</h1>
          <p>
            {rules.length} წესი · პროდუქტები {covered}/{products.length} · ტოპინგები {coveredT}/
            {toppings.length}
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/stock">
          ← მარაგი
        </Link>
      </div>

      {sp.saved && <div className="alert alert-ok">შენახულია.</div>}

      {items.length === 0 && (
        <div className="alert alert-error">
          საწყობის ერთეული ჯერ არ არის. <Link href="/admin/stock/items/new">დაამატე ჯერ ისინი →</Link>
        </div>
      )}

      <div className="admin-panel">
        <h2>როგორ მუშაობს</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: "var(--a-muted)" }}>
          <li>
            <b>პროდუქტზე</b> ეწერება ბაზა — ცომი, სოუსი, ყუთი. კოკა-კოლაზე — თავად კოკა-კოლა, 1 ცალი.
          </li>
          <li>
            <b>ტოპინგზე</b> ეწერება მისი ხარჯი — მოცარელა 0.18 კგ. პიცის ინგრედიენტები ტოპინგებია,
            ამიტომ ცალკე ჩაწერა არ სჭირდება.
          </li>
          <li>ზომა ცარიელი = ყველა ზომაზე ერთი და იგივე. კონკრეტული ზომა ჩრდილავს ზოგადს.</li>
          <li>
            რაოდენობა იმ ერთეულშია, რომელიც <b>საწყობის ერთეულს</b> აქვს — თუ კილოგრამებში ინახავ,
            აქაც კილოგრამი წერე (0.18).
          </li>
          <li>წესის არარსებობა შეკვეთას არ აჩერებს — უბრალოდ ის პოზიცია მარაგს არ ეხება.</li>
        </ul>
      </div>

      {/* ── ახალი წესი ── */}
      <form className="admin-panel admin-form" action={addRule} style={{ maxWidth: "none" }}>
        <h2>წესის დამატება</h2>

        <div className="field-row" style={{ gridTemplateColumns: "2fr 2fr 1fr 1fr" }}>
          <div className="field">
            <label htmlFor="owner">რაზე</label>
            <select id="owner" name="owner" defaultValue={sp.owner ?? ""} required>
              <option value="">— აირჩიე —</option>
              <optgroup label="ტოპინგი">
                {toppings.map((t) => (
                  <option key={t.id} value={`topping:${t.id}`}>
                    {i18nText(t.name)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="პროდუქტი">
                {products.map((p) => (
                  <option key={p.id} value={`product:${p.id}`}>
                    {i18nText(p.name)} · {i18nText(p.category.name)}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="field">
            <label htmlFor="itemId">საწყობის ერთეული</label>
            <select id="itemId" name="itemId" required>
              <option value="">— აირჩიე —</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {i18nText(it.name)} ({it.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="qty">რაოდენობა</label>
            <input id="qty" name="qty" type="number" step="0.001" min="0" required />
          </div>

          <div className="field">
            <label htmlFor="sizeKey">ზომა</label>
            <select id="sizeKey" name="sizeKey" defaultValue="">
              <option value="">ყველა</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="XL">XL</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            დამატება
          </button>
        </div>
      </form>

      {/* ── არსებული წესები ── */}
      <form action={saveRules}>
        <div className="admin-panel">
          <h2>ტოპინგები ({toppingRules.length})</h2>
          {toppingRules.length === 0 ? (
            <p className="hint" style={{ margin: 0 }}>
              ჯერ არცერთი. დაიწყე მოცარელით — ის თითქმის ყველა პიცაშია.
            </p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ტოპინგი</th>
                  <th>ხარჯავს</th>
                  <th style={{ width: 90 }}>ზომა</th>
                  <th style={{ width: 130 }}>რაოდენობა</th>
                  <th style={{ width: 70 }}>წაშლა</th>
                </tr>
              </thead>
              <tbody>
                {toppingRules.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {i18nText(r.topping!.name)}
                      <input type="hidden" name="rule" value={r.id} />
                    </td>
                    <td>{i18nText(r.item.name)}</td>
                    <td>
                      <span className="hint">{r.sizeKey ?? "ყველა"}</span>
                    </td>
                    <td>
                      <input
                        name={`qty_${r.id}`}
                        type="number"
                        step="0.001"
                        min="0"
                        defaultValue={Number(r.qty)}
                        style={inp}
                      />
                      <span className="hint">{r.item.unit}</span>
                    </td>
                    <td>
                      <input type="checkbox" name={`del_${r.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-panel">
          <h2>პროდუქტები ({productRules.length})</h2>
          {productRules.length === 0 ? (
            <p className="hint" style={{ margin: 0 }}>
              ჯერ არცერთი. პიცაზე ჩაწერე ცომი და სოუსი, სასმელზე — თავად სასმელი.
            </p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>პროდუქტი</th>
                  <th>ხარჯავს</th>
                  <th style={{ width: 90 }}>ზომა</th>
                  <th style={{ width: 130 }}>რაოდენობა</th>
                  <th style={{ width: 70 }}>წაშლა</th>
                </tr>
              </thead>
              <tbody>
                {productRules.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {i18nText(r.product!.name)}
                      <input type="hidden" name="rule" value={r.id} />
                    </td>
                    <td>{i18nText(r.item.name)}</td>
                    <td>
                      <span className="hint">{r.sizeKey ?? "ყველა"}</span>
                    </td>
                    <td>
                      <input
                        name={`qty_${r.id}`}
                        type="number"
                        step="0.001"
                        min="0"
                        defaultValue={Number(r.qty)}
                        style={inp}
                      />
                      <span className="hint">{r.item.unit}</span>
                    </td>
                    <td>
                      <input type="checkbox" name={`del_${r.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rules.length > 0 && (
          <div className="form-actions">
            <button className="btn" type="submit">
              ცვლილებების შენახვა
            </button>
          </div>
        )}
      </form>
    </>
  );
}
