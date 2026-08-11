import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { i18nText, i18nOf } from "@/lib/admin-utils";
import { fmtQty } from "@/lib/stock";
import { updateStockItem, archiveStockItem } from "../../actions";
import ArchiveButton from "../../../_components/ArchiveButton";

export const dynamic = "force-dynamic";

const MOVE_LABEL: Record<string, string> = {
  receipt: "მიღება",
  transfer_out: "გაცემა",
  transfer_in: "მიღება გადატანით",
  production_in: "წარმოებამ დაამზადა",
  production_out: "წარმოებამ დახარჯა",
  sale: "გაყიდვა",
  waste: "ჩამოწერა",
  count_adjust: "ინვენტარიზაცია",
};

export default async function StockItemEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [item, locations, movements] = await Promise.all([
    db.stockItem.findUnique({ where: { id }, include: { levels: true } }),
    db.stockLocation.findMany({ where: { deletedAt: null }, orderBy: [{ type: "asc" }, { createdAt: "asc" }] }),
    db.stockMovement.findMany({
      where: { itemId: id },
      orderBy: { at: "desc" },
      take: 25,
      include: { location: true },
    }),
  ]);
  if (!item) notFound();

  const name = i18nOf(item.name);
  const levelOf = new Map(item.levels.map((l) => [l.locationId, l]));
  const totalQty = item.levels.reduce((s, l) => s + Number(l.qty), 0);

  const save = updateStockItem.bind(null, id);
  const archive = archiveStockItem.bind(null, id);

  const consequences = [
    "მარაგის ეკრანიდან და მოძრაობის ფორმიდან გაქრება.",
    `${item.levels.length} ლოკაციაზე ნაშთი (სულ ${fmtQty(totalQty, item.unit)}) შენარჩუნდება.`,
    `${movements.length >= 25 ? "25+" : movements.length} მოძრაობის ისტორია ხელუხლებელი რჩება.`,
    "თუ ეს ერთეული რომელიმე რეცეპტშია, ის რეცეპტი აღარ იმუშავებს — ჯერ შეამოწმე.",
  ];

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{name.ka || name.en}</h1>
          <p>
            {item.unit} · სულ {fmtQty(totalQty, item.unit)}
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/stock/items">
          ← სია
        </Link>
      </div>

      <form className="admin-form" action={save} style={{ maxWidth: 900 }}>
        <div className="admin-panel">
          <h2>ძირითადი</h2>

          <div className="field-row">
            <div className="field">
              <label htmlFor="name_en">დასახელება (EN)</label>
              <input id="name_en" name="name_en" type="text" defaultValue={name.en} required />
            </div>
            <div className="field">
              <label htmlFor="name_ka">დასახელება (KA)</label>
              <input id="name_ka" name="name_ka" type="text" defaultValue={name.ka} />
            </div>
          </div>

          <div className="field-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div className="field">
              <label htmlFor="unit">ერთეული</label>
              <select id="unit" name="unit" defaultValue={item.unit}>
                <option value="kg">კილოგრამი</option>
                <option value="g">გრამი</option>
                <option value="l">ლიტრი</option>
                <option value="ml">მილილიტრი</option>
                <option value="pcs">ცალი</option>
              </select>
              <span className="hint">შეცვლა ძველ მოძრაობებს არ გადაითვლის.</span>
            </div>
            <div className="field">
              <label htmlFor="category">ჯგუფი</label>
              <input id="category" name="category" type="text" defaultValue={item.category ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="sku">SKU</label>
              <input id="sku" name="sku" type="text" defaultValue={item.sku ?? ""} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="note">შენიშვნა</label>
            <input id="note" name="note" type="text" defaultValue={item.note ?? ""} />
          </div>

          <div className="field-check">
            <input id="isProduced" name="isProduced" type="checkbox" defaultChecked={item.isProduced} />
            <label htmlFor="isProduced">საწარმოში მზადდება რეცეპტით</label>
          </div>
          <div className="field-check">
            <input id="active" name="active" type="checkbox" defaultChecked={item.active} />
            <label htmlFor="active">აქტიური</label>
          </div>
        </div>

        {/* ── მინიმუმები ლოკაციებზე ── */}
        <div className="admin-panel">
          <h2>ნაშთი და ზღვრები</h2>
          <p className="hint" style={{ marginTop: -8, marginBottom: 14 }}>
            ⭐ <b>საწარმოსაც</b> დაუყენე მინიმუმი — თორემ ფილიალები შეავსებენ და საწყობი ჩუმად
            დაიცლება.
          </p>

          <table className="admin-table">
            <thead>
              <tr>
                <th>ლოკაცია</th>
                <th style={{ width: 130 }}>ნაშთი</th>
                <th style={{ width: 130 }}>მინიმუმი</th>
                <th style={{ width: 130 }}>სამიზნე</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => {
                const l = levelOf.get(loc.id);
                const qty = l ? Number(l.qty) : 0;
                const min = l?.minLevel != null ? Number(l.minLevel) : "";
                const target = l?.targetLevel != null ? Number(l.targetLevel) : "";
                const low = l?.minLevel != null && qty <= Number(l.minLevel);

                return (
                  <tr key={loc.id}>
                    <td>
                      {i18nText(loc.name)}
                      {loc.type === "warehouse" && <span className="hint"> ⭐ საწარმო</span>}
                    </td>
                    <td>
                      <b style={low ? { color: "var(--a-danger)" } : undefined}>
                        {fmtQty(qty, item.unit)}
                      </b>
                    </td>
                    <td>
                      <input
                        name={`min_${loc.id}`}
                        type="number"
                        step="0.001"
                        min="0"
                        defaultValue={min}
                        style={inp}
                      />
                    </td>
                    <td>
                      <input
                        name={`target_${loc.id}`}
                        type="number"
                        step="0.001"
                        min="0"
                        defaultValue={target}
                        style={inp}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="hint" style={{ marginTop: 10 }}>
            ზღვრები ნაშთის გარეშეც ივსება — შეავსე ახლა, მიღება მოგვიანებით ჩაწერე.
            ცარიელი ველი ნიშნავს, რომ ამ ლოკაციაზე კონტროლი გამორთულია.
          </p>
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შენახვა
          </button>
          <Link className="btn btn-ghost" href="/admin/stock/items">
            გაუქმება
          </Link>
        </div>
      </form>

      {/* ── ჟურნალი ── */}
      <div className="admin-panel" style={{ maxWidth: 900 }}>
        <h2>ბოლო მოძრაობები</h2>
        {movements.length === 0 ? (
          <p className="hint" style={{ margin: 0 }}>
            მოძრაობა ჯერ არ ყოფილა.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 150 }}>დრო</th>
                <th>ლოკაცია</th>
                <th style={{ width: 150 }}>ტიპი</th>
                <th style={{ width: 110 }}>რაოდენობა</th>
                <th style={{ width: 110 }}>ნაშთი</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const q = Number(m.qty);
                return (
                  <tr key={m.id}>
                    <td>
                      <span className="hint">{new Date(m.at).toLocaleString("ka-GE")}</span>
                    </td>
                    <td>
                      {i18nText(m.location.name)}
                      {m.note && <div className="hint">{m.note}</div>}
                    </td>
                    <td>
                      <span className="hint">{MOVE_LABEL[m.type] ?? m.type}</span>
                    </td>
                    <td>
                      <b style={{ color: q < 0 ? "var(--a-danger)" : "var(--a-ok)" }}>
                        {q > 0 ? "+" : ""}
                        {q}
                      </b>
                    </td>
                    <td>
                      <span className="hint">
                        {m.balanceAfter != null ? Number(m.balanceAfter) : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-panel" style={{ maxWidth: 900 }}>
        <h2>არქივი</h2>
        <ArchiveButton action={archive} subject={name.ka || name.en} consequences={consequences} />
      </div>
    </>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--a-line)",
  borderRadius: 6,
  font: "inherit",
};
