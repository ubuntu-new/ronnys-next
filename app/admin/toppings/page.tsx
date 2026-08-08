import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText, money } from "@/lib/admin-utils";
import { saveToppingPrices } from "./actions";

export const dynamic = "force-dynamic";

export default async function ToppingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; archived?: string }>;
}) {
  const sp = await searchParams;

  const toppings = await db.topping.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: { prices: { orderBy: { sizeKey: "asc" } } },
  });

  const sizeKeys = Array.from(
    new Set(toppings.flatMap((t) => t.prices.map((p) => p.sizeKey))),
  ).sort();

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ტოპინგები</h1>
          <p>{toppings.length} ჩანაწერი · ფასები ზომების მიხედვით</p>
        </div>
        <Link className="btn" href="/admin/toppings/new">
          + ახალი ტოპინგი
        </Link>
      </div>

      {sp.saved && <div className="alert alert-ok">შენახულია.</div>}
      {sp.archived && <div className="alert alert-ok">არქივში გადავიდა. დაბრუნება — „არქივი“ გვერდიდან.</div>}

      <form action={saveToppingPrices}>
        <div className="admin-panel">
          <h2>ფასები და სტატუსი</h2>
          <p className="hint" style={{ marginTop: -8, marginBottom: 14 }}>
            ცვლილებები ერთდროულად ინახება. ფოტოსა და სახელის შესაცვლელად დააჭირე დასახელებას.
          </p>

          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 46 }}></th>
                <th>დასახელება</th>
                <th>ჯგუფი</th>
                {sizeKeys.map((k) => (
                  <th key={k} style={{ width: 90 }}>
                    {k} (₾)
                  </th>
                ))}
                <th style={{ width: 90 }}>ჩართული</th>
              </tr>
            </thead>
            <tbody>
              {toppings.map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="admin-thumb" src={t.photo} alt="" />
                    ) : (
                      <div className="admin-thumb" />
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/toppings/${t.id}`}>{i18nText(t.name)}</Link>
                    <div className="hint">
                      {i18nText(t.name, "en")}
                      {t.recipeOnly ? " · მხოლოდ რეცეპტში" : ""}
                    </div>
                  </td>
                  <td>
                    <span className="hint">{t.category ?? "—"}</span>
                  </td>
                  {sizeKeys.map((k) => {
                    const p = t.prices.find((x) => x.sizeKey === k);
                    return (
                      <td key={k}>
                        {p ? (
                          <input
                            name={`price_${t.id}_${k}`}
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={money(p.price)}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              border: "1px solid var(--a-line)",
                              borderRadius: 6,
                              font: "inherit",
                            }}
                          />
                        ) : (
                          <span className="hint">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td>
                    <input type="hidden" name={`present_${t.id}`} value="1" />
                    <input type="checkbox" name={`active_${t.id}`} defaultChecked={t.active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="form-actions" style={{ marginTop: 18 }}>
            <button className="btn" type="submit">
              ყველას შენახვა
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
