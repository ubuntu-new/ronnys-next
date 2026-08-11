import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { fmtQty } from "@/lib/stock";
import { createTransfer } from "../actions";

export const dynamic = "force-dynamic";

const inp: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--a-line)",
  borderRadius: 6,
  font: "inherit",
};

export default async function NewTransfer({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;

  const [locations, items, levels] = await Promise.all([
    db.stockLocation.findMany({ where: { deletedAt: null, active: true }, orderBy: { type: "asc" } }),
    db.stockItem.findMany({ where: { deletedAt: null, active: true }, orderBy: { category: "asc" } }),
    db.stockLevel.findMany(),
  ]);

  const warehouse = locations.find((l) => l.type === "warehouse");
  const fromId = sp.from ?? warehouse?.id ?? locations[0]?.id ?? "";
  const qtyAt = (loc: string, item: string) =>
    Number(levels.find((l) => l.locationId === loc && l.itemId === item)?.qty ?? 0);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ახალი გადატანა</h1>
          <p>შეავსე მხოლოდ ის პოზიციები, რომლებიც გადააქვს</p>
        </div>
        <Link className="btn btn-ghost" href="/admin/stock/transfers">
          ← სია
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="admin-panel">
          <p className="hint" style={{ margin: 0 }}>
            საწყობის ერთეული ჯერ არ არის. <Link href="/admin/stock/items/new">დაამატე ჯერ ისინი →</Link>
          </p>
        </div>
      ) : (
        <form className="admin-form" action={createTransfer} style={{ maxWidth: "none" }}>
          <div className="admin-panel">
            <h2>საიდან და სად</h2>
            <div className="field-row">
              <div className="field">
                <label htmlFor="fromLocationId">საიდან</label>
                <select id="fromLocationId" name="fromLocationId" defaultValue={fromId} required>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {i18nText(l.name)}
                      {l.type === "warehouse" ? " ⭐" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="toLocationId">სად</label>
                <select id="toLocationId" name="toLocationId" defaultValue={sp.to ?? ""} required>
                  <option value="">— აირჩიე —</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {i18nText(l.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="note">შენიშვნა</label>
              <input id="note" name="note" type="text" placeholder="მიზეზი, ვადა…" />
            </div>
          </div>

          <div className="admin-panel">
            <h2>პოზიციები</h2>
            <p className="hint" style={{ marginTop: -8, marginBottom: 14 }}>
              „ნაშთი“ არჩეული წყაროს მიხედვითაა ნაჩვენები გვერდის ჩატვირთვისას.
            </p>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ერთეული</th>
                  <th style={{ width: 100 }}>ჯგუფი</th>
                  <th style={{ width: 140 }}>ნაშთი წყაროში</th>
                  <th style={{ width: 160 }}>რაოდენობა</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>{i18nText(it.name)}</td>
                    <td>
                      <span className="hint">{it.category ?? "—"}</span>
                    </td>
                    <td>
                      <span className="hint">{fmtQty(qtyAt(fromId, it.id), it.unit)}</span>
                    </td>
                    <td>
                      <input
                        name={`qty_${it.id}`}
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0"
                        style={inp}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button className="btn" type="submit">
              მოთხოვნის შექმნა
            </button>
            <Link className="btn btn-ghost" href="/admin/stock/transfers">
              გაუქმება
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
