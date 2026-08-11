import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { fmtQty } from "@/lib/stock";
import { PSTATUS, PTONE } from "./status";

export const dynamic = "force-dynamic";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;

  const [orders, counts] = await Promise.all([
    db.productionOrder.findMany({
      where: sp.status ? { status: sp.status as never } : undefined,
      orderBy: { startedAt: "desc" },
      take: 100,
      include: { recipe: { include: { outputItem: true } }, location: true },
    }),
    db.productionOrder.groupBy({ by: ["status"], _count: true }),
  ]);

  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>წარმოება</h1>
          <p>
            {orders.length} ნაჩვენები · მიმდინარე {countOf("in_progress")}
          </p>
        </div>
        <Link className="btn" href="/admin/stock/production/new">
          + პარტიის დაწყება
        </Link>
      </div>

      <div className="admin-panel">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className={sp.status ? "btn btn-ghost" : "btn"} href="/admin/stock/production">
            ყველა
          </Link>
          {Object.keys(PSTATUS).map((s) => (
            <Link
              key={s}
              className={sp.status === s ? "btn" : "btn btn-ghost"}
              href={`/admin/stock/production?status=${s}`}
            >
              {PSTATUS[s]} {countOf(s) > 0 && `(${countOf(s)})`}
            </Link>
          ))}
          <Link className="btn btn-ghost" href="/admin/stock/recipes">
            რეცეპტები
          </Link>
        </div>
      </div>

      <div className="admin-panel">
        {orders.length === 0 ? (
          <p className="hint" style={{ margin: 0 }}>
            პარტია ჯერ არ ყოფილა. ჯერ <Link href="/admin/stock/recipes">რეცეპტი</Link> შექმენი.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>№</th>
                <th>რეცეპტი</th>
                <th>ლოკაცია</th>
                <th style={{ width: 110 }}>დაგეგმილი</th>
                <th style={{ width: 110 }}>ფაქტობრივი</th>
                <th style={{ width: 100 }}>გამოსავალი</th>
                <th style={{ width: 110 }}>სტატუსი</th>
                <th style={{ width: 150 }}>დაიწყო</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const planned = Number(o.plannedQty);
                const actual = o.actualQty != null ? Number(o.actualQty) : null;
                const pct = actual != null && planned > 0 ? Math.round((actual / planned) * 1000) / 10 : null;
                const unit = o.recipe.outputItem.unit;

                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/stock/production/${o.id}`}>
                        <b>#{o.no}</b>
                      </Link>
                    </td>
                    <td>
                      {i18nText(o.recipe.name)}
                      <div className="hint">{i18nText(o.recipe.outputItem.name)}</div>
                    </td>
                    <td>{i18nText(o.location.name)}</td>
                    <td>{fmtQty(planned, unit)}</td>
                    <td>
                      {actual != null ? fmtQty(actual, unit) : <span className="hint">—</span>}
                    </td>
                    <td>
                      {pct != null ? (
                        <span
                          className="badge"
                          style={
                            pct < 95
                              ? { background: "#fdecea", color: "#b3261e" }
                              : { background: "#e8f2e8", color: "#3f7d3f" }
                          }
                        >
                          {pct}%
                        </span>
                      ) : (
                        <span className="hint">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={PTONE[o.status] ?? { background: "#f5f5f4", color: "#78716c" }}
                      >
                        {PSTATUS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td>
                      <span className="hint">{new Date(o.startedAt).toLocaleString("ka-GE")}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-panel">
        <h2>გამოსავალი</h2>
        <p className="hint" style={{ margin: 0 }}>
          რეცეპტით 100 გუნდა უნდა გამოსულიყო, ფაქტობრივად 88 — <b>88%</b>. თუ ეს რიცხვი
          სისტემატურად დაბალია, ან რეცეპტია არაზუსტი, ან სადმე დანაკარგია. სწორედ ამის
          დასაჭერად ინახება დაგეგმილი და ფაქტობრივი ცალკე.
        </p>
      </div>
    </>
  );
}
