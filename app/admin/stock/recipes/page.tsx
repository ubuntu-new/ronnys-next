import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { fmtQty } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const sp = await searchParams;

  const recipes = await db.recipe.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { outputItem: true, lines: { include: { item: true } }, _count: { select: { orders: true } } },
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>წარმოების რეცეპტები</h1>
          <p>{recipes.length} რეცეპტი</p>
        </div>
        <Link className="btn" href="/admin/stock/recipes/new">
          + ახალი რეცეპტი
        </Link>
      </div>

      {sp.archived && <div className="alert alert-ok">არქივში გადავიდა.</div>}

      <div className="admin-panel">
        <p className="hint" style={{ marginTop: 0 }}>
          ეს არის <b>საწარმოს</b> რეცეპტი — ნედლეულიდან ნახევარფაბრიკატი.
          მენიუს რეცეპტი („რა იხარჯება პიცაზე“) ცალკეა:{" "}
          <Link href="/admin/stock/consumption">ხარჯვის წესები</Link>.
        </p>

        {recipes.length === 0 ? (
          <p className="hint" style={{ margin: 0 }}>
            ჯერ ცარიელია. მაგალითი: ფქვილი 15კგ + წყალი 9ლ + საფუარი 0.2კგ → 100 ცომის გუნდა.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>რეცეპტი</th>
                <th>რას აწარმოებს</th>
                <th style={{ width: 130 }}>ერთი გატარება</th>
                <th style={{ width: 90 }}>შემავალი</th>
                <th style={{ width: 90 }}>პარტია</th>
                <th style={{ width: 100 }}>სტატუსი</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/stock/recipes/${r.id}`}>{i18nText(r.name)}</Link>
                    <div className="hint">
                      {r.lines.map((l) => i18nText(l.item.name)).join(", ") || "შემავალი არ აქვს"}
                    </div>
                  </td>
                  <td>{i18nText(r.outputItem.name)}</td>
                  <td>{fmtQty(Number(r.outputQty), r.outputItem.unit)}</td>
                  <td>{r.lines.length}</td>
                  <td>{r._count.orders}</td>
                  <td>
                    <span className={r.active ? "badge badge-on" : "badge badge-off"}>
                      {r.active ? "აქტიური" : "გამორთული"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
