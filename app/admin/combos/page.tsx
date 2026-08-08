import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText, money, num } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function CombosPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; archived?: string }>;
}) {
  const sp = await searchParams;

  const combos = await db.combo.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: { slots: { include: { options: true } } },
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>კომბოები</h1>
          <p>{combos.length} ჩანაწერი</p>
        </div>
        <Link className="btn" href="/admin/combos/new">
          + ახალი კომბო
        </Link>
      </div>

      {sp.saved && <div className="alert alert-ok">შენახულია.</div>}
      {sp.archived && <div className="alert alert-ok">არქივში გადავიდა. დაბრუნება — „არქივი“ გვერდიდან.</div>}

      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}></th>
              <th>დასახელება</th>
              <th>ფასდადება</th>
              <th>სლოტები</th>
              <th>სტატუსი</th>
            </tr>
          </thead>
          <tbody>
            {combos.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="admin-thumb" src={c.photo} alt="" />
                  ) : (
                    <div className="admin-thumb" />
                  )}
                </td>
                <td>
                  <Link href={`/admin/combos/${c.id}`}>{i18nText(c.name)}</Link>
                  <div className="hint">{i18nText(c.description)}</div>
                </td>
                <td>
                  {c.pricingMode === "fixed" ? (
                    <>{money(c.price)} ₾</>
                  ) : (
                    <span className="badge badge-promo">−{num(c.percent)}%</span>
                  )}
                </td>
                <td>
                  {c.slots.map((s) => (
                    <div key={s.id} className="hint">
                      {i18nText(s.label)} · {s.mode === "fixed" ? "ფიქსირებული" : `${s.options.length} ვარიანტი`}
                    </div>
                  ))}
                </td>
                <td>
                  <span className={c.active ? "badge badge-on" : "badge badge-off"}>
                    {c.active ? "ჩართული" : "გამორთული"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-panel">
        <h2>შენიშვნა</h2>
        <p className="hint">
          კომბოზე მომხმარებლის ფასდაკლება არასდროს ვრცელდება — ეს დამტკიცებული წესია.
        </p>
      </div>
    </>
  );
}
