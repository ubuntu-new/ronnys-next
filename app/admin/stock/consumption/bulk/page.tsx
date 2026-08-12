import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { createItemsFromToppings, saveBulkConsumption } from "./actions";

export const dynamic = "force-dynamic";

const inp: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--a-line)",
  borderRadius: 6,
  font: "inherit",
};

/** სახელით ავტომატური დაკავშირება — მოცარელა → მოცარელა */
function autoMatch(toppingName: string, items: { id: string; name: unknown }[]) {
  const n = toppingName.trim().toLowerCase();
  return (
    items.find((i) => String((i.name as Record<string, unknown>)?.en ?? "").trim().toLowerCase() === n)?.id ?? ""
  );
}

export default async function BulkConsumptionPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; created?: string }>;
}) {
  const sp = await searchParams;

  const [toppings, items, rules] = await Promise.all([
    db.topping.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    db.stockItem.findMany({ where: { deletedAt: null, active: true }, orderBy: { category: "asc" } }),
    db.consumptionRule.findMany({ where: { toppingId: { not: null } } }),
  ]);

  // მიმდინარე მდგომარეობა: M-ის წესი თითო ტოპინგზე
  const current = new Map<string, { itemId: string; qtyM: number }>();
  for (const r of rules) {
    if (!r.toppingId) continue;
    const isM = r.sizeKey === "M" || r.sizeKey === null;
    if (!isM && current.has(r.toppingId)) continue;
    if (isM || !current.has(r.toppingId)) {
      current.set(r.toppingId, { itemId: r.itemId, qtyM: Number(r.qty) });
    }
  }

  const filled = toppings.filter((t) => current.has(t.id)).length;
  const missingItems = toppings.filter(
    (t) => !autoMatch(i18nText(t.name, "en"), items) && !current.has(t.id),
  ).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ტოპინგების ხარჯვა</h1>
          <p>
            {filled}/{toppings.length} შევსებული
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/stock/consumption">
          ← ყველა წესი
        </Link>
      </div>

      {sp.saved && <div className="alert alert-ok">შენახულია — {sp.saved} წესი.</div>}
      {sp.created && (
        <div className="alert alert-ok">
          {sp.created === "0" ? "ყველა ერთეული უკვე არსებობდა." : `${sp.created} ერთეული შეიქმნა.`}
        </div>
      )}

      {missingItems > 0 && (
        <div className="admin-panel">
          <h2>ჯერ საწყობის ერთეულები</h2>
          <p className="hint" style={{ marginTop: -8, marginBottom: 12 }}>
            <b>{missingItems} ტოპინგს</b> საწყობის ერთეული არ აქვს. პრემიუმ ტოპინგსაც თავისი
            სჭირდება — პროშუტოს ღირებულება მოცარელადან ვერ გამოითვლება.
          </p>
          <form action={createItemsFromToppings}>
            <button className="btn" type="submit">
              შექმენი ტოპინგებიდან ({missingItems})
            </button>
          </form>
          <p className="hint" style={{ marginTop: 10 }}>
            კილოგრამებში შეიქმნება. თუ რომელიმე ცალობითია, ერთეულის გვერდზე შეცვლი.
          </p>
        </div>
      )}

      <form action={saveBulkConsumption}>
        <div className="admin-panel">
          <h2>ზომების კოეფიციენტი</h2>
          <p className="hint" style={{ marginTop: -8, marginBottom: 12 }}>
            ჩაწერ <b>M-ის</b> გრამაჟს — S და XL აქედან დაითვლება. ნაგულისხმევი რიცხვები
            თქვენივე ფასების პროპორციიდანაა აღებული.
          </p>
          <div className="field-row" style={{ maxWidth: 420 }}>
            <div className="field">
              <label htmlFor="ratioS">S = M ×</label>
              <input id="ratioS" name="ratioS" type="number" step="0.01" min="0" defaultValue="0.55" />
            </div>
            <div className="field">
              <label htmlFor="ratioXL">XL = M ×</label>
              <input id="ratioXL" name="ratioXL" type="number" step="0.01" min="0" defaultValue="1.68" />
            </div>
          </div>
        </div>

        <div className="admin-panel">
          <h2>ტოპინგები</h2>
          <p className="hint" style={{ marginTop: -8, marginBottom: 14 }}>
            ცარიელი გრამაჟი = წესი არ გვჭირდება (არსებული წაიშლება).
          </p>

          <table className="admin-table">
            <thead>
              <tr>
                <th>ტოპინგი</th>
                <th style={{ width: 280 }}>საწყობის ერთეული</th>
                <th style={{ width: 150 }}>M გრამაჟი</th>
              </tr>
            </thead>
            <tbody>
              {toppings.map((t) => {
                const nameEn = i18nText(t.name, "en");
                const cur = current.get(t.id);
                const guess = cur?.itemId || autoMatch(nameEn, items);

                return (
                  <tr key={t.id}>
                    <td>
                      <input type="hidden" name="row" value={t.id} />
                      {i18nText(t.name)}
                      <div className="hint">
                        {nameEn}
                        {t.recipeOnly && " · მხოლოდ რეცეპტში"}
                      </div>
                    </td>
                    <td>
                      <select name={`item_${t.id}`} defaultValue={guess} style={inp}>
                        <option value="">— არ ითვლება —</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {i18nText(it.name)} ({it.unit})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        name={`qty_${t.id}`}
                        type="number"
                        step="0.001"
                        min="0"
                        defaultValue={cur ? cur.qtyM : ""}
                        placeholder="0.18"
                        style={inp}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="form-actions" style={{ marginTop: 18 }}>
            <button className="btn" type="submit">
              ყველას შენახვა
            </button>
          </div>
        </div>
      </form>

      <div className="admin-panel">
        <h2>რატომ ასე</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: "var(--a-muted)" }}>
          <li>
            24 ტოპინგი × 3 ზომა = <b>72 ჩანაწერი</b>. კოეფიციენტით 24 ველი კმარა და
            შეცდომის ადგილი აღარ რჩება.
          </li>
          <li>
            <b>პრემიუმ ტოპინგი</b> ცალკე მექანიზმს არ საჭიროებს — მას თავისი ერთეული და
            თავისი ფასი აქვს, ამიტომ მოგების % ავტომატურად სწორად გამოდის. სწორედ აქ
            დაინახავ, პრემიუმი მართლა მომგებიანია თუ მხოლოდ ძვირი.
          </li>
          <li>
            პიცის ინგრედიენტები ტოპინგებია — ერთხელ ჩაწერ და{" "}
            <b>ყველა პიცაზე ვრცელდება</b>.
          </li>
        </ul>
      </div>
    </>
  );
}
