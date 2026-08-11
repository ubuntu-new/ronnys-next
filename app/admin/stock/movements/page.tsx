import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  receipt: "მიღება",
  transfer_out: "გაცემა",
  transfer_in: "მიღება გადატანით",
  production_in: "წარმოებამ დაამზადა",
  production_out: "წარმოებამ დახარჯა",
  sale: "გაყიდვა",
  waste: "ჩამოწერა",
  count_adjust: "ინვენტარიზაცია",
};

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string; type?: string }>;
}) {
  const sp = await searchParams;

  const [locations, movements] = await Promise.all([
    db.stockLocation.findMany({ where: { deletedAt: null }, orderBy: { type: "asc" } }),
    db.stockMovement.findMany({
      where: {
        ...(sp.loc ? { locationId: sp.loc } : {}),
        ...(sp.type ? { type: sp.type as never } : {}),
      },
      orderBy: { at: "desc" },
      take: 200,
      include: { location: true, item: true },
    }),
  ]);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>მარაგის ჟურნალი</h1>
          <p>ბოლო {movements.length} მოძრაობა</p>
        </div>
        <Link className="btn btn-ghost" href="/admin/stock">
          ← ნაშთები
        </Link>
      </div>

      <div className="admin-panel">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <Link className={sp.loc ? "btn btn-ghost" : "btn"} href="/admin/stock/movements">
            ყველა ლოკაცია
          </Link>
          {locations.map((l) => (
            <Link
              key={l.id}
              className={sp.loc === l.id ? "btn" : "btn btn-ghost"}
              href={`/admin/stock/movements?loc=${l.id}`}
            >
              {i18nText(l.name)}
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className={sp.type ? "btn btn-ghost" : "btn"} href="/admin/stock/movements">
            ყველა ტიპი
          </Link>
          {Object.keys(LABEL).map((t) => (
            <Link
              key={t}
              className={sp.type === t ? "btn" : "btn btn-ghost"}
              href={`/admin/stock/movements?type=${t}`}
            >
              {LABEL[t]}
            </Link>
          ))}
        </div>
      </div>

      <div className="admin-panel">
        {movements.length === 0 ? (
          <p className="hint" style={{ margin: 0 }}>
            მოძრაობა ჯერ არ ყოფილა.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 150 }}>დრო</th>
                <th>ერთეული</th>
                <th>ლოკაცია</th>
                <th style={{ width: 150 }}>ტიპი</th>
                <th style={{ width: 100 }}>რაოდ.</th>
                <th style={{ width: 100 }}>ნაშთი</th>
                <th>შენიშვნა</th>
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
                      <Link href={`/admin/stock/items/${m.itemId}`}>{i18nText(m.item.name)}</Link>
                    </td>
                    <td>{i18nText(m.location.name)}</td>
                    <td>
                      <span className="hint">{LABEL[m.type] ?? m.type}</span>
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
                    <td>
                      <span className="hint">
                        {m.note ?? (m.refType ? `${m.refType} ${m.refId ?? ""}` : "")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
