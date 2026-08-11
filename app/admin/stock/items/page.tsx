import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { fmtQty } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function StockItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; archived?: string }>;
}) {
  const sp = await searchParams;

  const items = await db.stockItem.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    include: { levels: true },
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>საწყობის ერთეულები</h1>
          <p>{items.length} ჩანაწერი</p>
        </div>
        <Link className="btn" href="/admin/stock/items/new">
          + ახალი ერთეული
        </Link>
      </div>

      {sp.saved && <div className="alert alert-ok">შენახულია.</div>}
      {sp.archived && <div className="alert alert-ok">არქივში გადავიდა.</div>}

      <div className="admin-panel">
        <p className="hint" style={{ marginTop: 0 }}>
          ეს არის ის, რასაც <b>ინახავ</b> — და არა ის, რასაც ყიდი. პიცა აქ არ არის;
          მოცარელა, ცომი და ფქვილი — არის.
        </p>

        {items.length === 0 ? (
          <p className="hint" style={{ margin: 0 }}>
            ჯერ ცარიელია.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>დასახელება</th>
                <th style={{ width: 90 }}>SKU</th>
                <th style={{ width: 90 }}>ერთეული</th>
                <th style={{ width: 100 }}>ჯგუფი</th>
                <th style={{ width: 130 }}>სულ ნაშთი</th>
                <th style={{ width: 110 }}>წარმოშობა</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const total = it.levels.reduce((s, l) => s + Number(l.qty), 0);
                return (
                  <tr key={it.id}>
                    <td>
                      <Link href={`/admin/stock/items/${it.id}`}>{i18nText(it.name)}</Link>
                      {!it.active && <div className="hint">გამორთული</div>}
                    </td>
                    <td>
                      <span className="hint">{it.sku ?? "—"}</span>
                    </td>
                    <td>{it.unit}</td>
                    <td>
                      <span className="hint">{it.category ?? "—"}</span>
                    </td>
                    <td>{fmtQty(total, it.unit)}</td>
                    <td>
                      <span className="badge badge-off">
                        {it.isProduced ? "იწარმოება" : "ყიდულობ"}
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
