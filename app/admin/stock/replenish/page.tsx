import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { fmtQty } from "@/lib/stock";
import { suggestReplenishment } from "@/lib/replenish";
import { createTransfer } from "../transfers/actions";

export const dynamic = "force-dynamic";

export default async function ReplenishPage() {
  const { warehouse, needs, warehouseLow, shortages } = await suggestReplenishment();

  const openTransfers = await db.transfer.findMany({
    where: { status: { in: ["requested", "approved", "sent"] } },
    select: { toLocationId: true, no: true, status: true },
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>შევსების წინადადებები</h1>
          <p>
            {needs.length} ფილიალს სჭირდება შევსება
            {warehouseLow.length > 0 && ` · საწარმოში ${warehouseLow.length} ერთეული ზღვარზეა`}
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/stock/transfers">
          გადატანები
        </Link>
      </div>

      {/* ── საწყობი ვერ დააკმაყოფილებს ── */}
      {shortages.length > 0 && (
        <div className="alert alert-error">
          <b>საწარმოს ნაშთი არ ჰყოფნის ყველა მოთხოვნას:</b>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {shortages.map((s) => (
              <li key={s.itemId}>
                {i18nText(s.name)} — საჭიროა {s.total} {s.unit}, აქვს {s.have} {s.unit} (აკლია{" "}
                <b>{s.gap}</b>)
              </li>
            ))}
          </ul>
        </div>
      )}

      {warehouseLow.length > 0 && (
        <div className="admin-panel">
          <h2>⭐ საწარმო თვითონ საჭიროებს შევსებას</h2>
          <p className="hint" style={{ marginTop: -8, marginBottom: 12 }}>
            ეს მიმწოდებლისგან შესყიდვის სიგნალია — ფილიალები ამას ვერ დააკმაყოფილებენ.
          </p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ერთეული</th>
                <th style={{ width: 120 }}>ნაშთი</th>
                <th style={{ width: 120 }}>მინიმუმი</th>
                <th style={{ width: 140 }}>შესასყიდი</th>
              </tr>
            </thead>
            <tbody>
              {warehouseLow.map((i) => (
                <tr key={i.itemId}>
                  <td>{i18nText(i.itemName)}</td>
                  <td>
                    <b style={{ color: "var(--a-danger)" }}>{fmtQty(i.qty, i.unit)}</b>
                  </td>
                  <td>
                    <span className="hint">{i.min}</span>
                  </td>
                  <td>
                    <span className="badge" style={{ background: "#fdf3d6", color: "#8a6a12" }}>
                      +{fmtQty(i.need, i.unit)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {needs.length === 0 ? (
        <div className="admin-panel">
          <p className="hint" style={{ margin: 0 }}>
            ყველა ფილიალი მინიმუმზე მაღლაა. წინადადება არ არის.
          </p>
          <p className="hint" style={{ marginTop: 8 }}>
            თუ ცარიელია მაშინაც, როცა მარაგი ცოტაა — შეამოწმე, დაყენებული გაქვს თუ არა
            <b> მინიმუმი და სამიზნე</b> ერთეულის გვერდზე.
          </p>
        </div>
      ) : (
        needs.map((n) => {
          const open = openTransfers.filter((t) => t.toLocationId === n.locationId);

          return (
            <form
              key={n.locationId}
              className="admin-panel"
              action={createTransfer}
            >
              <h2>{i18nText(n.locationName)}</h2>

              {open.length > 0 && (
                <div className="alert" style={{ background: "#fdf3d6", color: "#8a6a12" }}>
                  ამ ფილიალს უკვე აქვს მიმდინარე გადატანა:{" "}
                  {open.map((t) => `#${t.no}`).join(", ")} — ჯერ ის შეამოწმე, რომ ორჯერ არ გაიგზავნოს.
                </div>
              )}

              <input type="hidden" name="fromLocationId" value={warehouse?.id ?? ""} />
              <input type="hidden" name="toLocationId" value={n.locationId} />
              <input type="hidden" name="note" value="ავტომატური წინადადება (მინიმუმზე ჩამოსვლა)" />

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ერთეული</th>
                    <th style={{ width: 110 }}>ნაშთი</th>
                    <th style={{ width: 100 }}>მინიმუმი</th>
                    <th style={{ width: 100 }}>სამიზნე</th>
                    <th style={{ width: 130 }}>საწარმოშია</th>
                    <th style={{ width: 150 }}>მოთხოვნა</th>
                  </tr>
                </thead>
                <tbody>
                  {n.items.map((i) => {
                    const enough = i.atSource >= i.need;
                    return (
                      <tr key={i.itemId}>
                        <td>{i18nText(i.itemName)}</td>
                        <td>
                          <b style={{ color: "var(--a-danger)" }}>{fmtQty(i.qty, i.unit)}</b>
                        </td>
                        <td>
                          <span className="hint">{i.min}</span>
                        </td>
                        <td>
                          <span className="hint">{i.target}</span>
                        </td>
                        <td>
                          <span
                            className="hint"
                            style={enough ? undefined : { color: "var(--a-danger)", fontWeight: 600 }}
                          >
                            {fmtQty(i.atSource, i.unit)}
                          </span>
                        </td>
                        <td>
                          <input
                            name={`qty_${i.itemId}`}
                            type="number"
                            step="0.001"
                            min="0"
                            defaultValue={i.need}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              border: "1px solid var(--a-line)",
                              borderRadius: 6,
                              font: "inherit",
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="form-actions" style={{ marginTop: 14 }}>
                <button className="btn" type="submit" disabled={!warehouse}>
                  მოთხოვნის შექმნა
                </button>
              </div>
            </form>
          );
        })
      )}

      <div className="admin-panel">
        <h2>როგორ ითვლება</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: "var(--a-muted)" }}>
          <li>
            <b>ნაშთი ≤ მინიმუმი</b> → წინადადება <b>სამიზნე − ნაშთი</b>. რიცხვი წინასწარ
            შევსებულია, მაგრამ შეგიძლია შეცვალო.
          </li>
          <li>
            „საწარმოშია“ სვეტი ჯერ <b>დამტკიცებამდე</b> გიჩვენებს, ჰყოფნის თუ არა — და არა
            მაშინ, როცა მანქანა უკვე გაგზავნილია.
          </li>
          <li>
            ⭐ საწარმოს საკუთარი მინიმუმი ცალკე მოწმდება — თორემ ხუთივე ფილიალი შეავსებს და
            საწყობი ჩუმად დაიცლება.
          </li>
        </ul>
      </div>
    </>
  );
}
