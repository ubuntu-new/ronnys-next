import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText, money } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; archived?: string; cat?: string }>;
}) {
  const sp = await searchParams;

  const categories = await db.category.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } });

  const products = await db.product.findMany({
    where: { deletedAt: null, ...(sp.cat ? { categoryId: sp.cat } : {}) },
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
    include: { category: true, sizes: { orderBy: { sortOrder: "asc" } }, promo: true },
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>პროდუქტები</h1>
          <p>{products.length} ჩანაწერი</p>
        </div>
        <Link className="btn" href="/admin/products/new">
          + ახალი პროდუქტი
        </Link>
      </div>

      {sp.saved && <div className="alert alert-ok">შენახულია.</div>}
      {sp.archived && <div className="alert alert-ok">არქივში გადავიდა. დაბრუნება — „არქივი“ გვერდიდან.</div>}

      <div className="admin-panel">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className={sp.cat ? "btn btn-ghost" : "btn"} href="/admin/products">
            ყველა
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              className={sp.cat === c.id ? "btn" : "btn btn-ghost"}
              href={`/admin/products?cat=${c.id}`}
            >
              {i18nText(c.name)}
            </Link>
          ))}
        </div>
      </div>

      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}></th>
              <th>დასახელება</th>
              <th>კატეგორია</th>
              <th>ფასი</th>
              <th>აქცია</th>
              <th>სტატუსი</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="admin-thumb" src={p.photo} alt="" />
                  ) : (
                    <div className="admin-thumb" />
                  )}
                </td>
                <td>
                  <Link href={`/admin/products/${p.id}`}>{i18nText(p.name)}</Link>
                  <div className="hint">{i18nText(p.name, "en")}</div>
                </td>
                <td>{i18nText(p.category.name)}</td>
                <td>
                  {p.sizes.length > 0
                    ? p.sizes.map((s) => `${s.key} ${money(s.price)}`).join(" · ")
                    : `${money(p.price)} ₾`}
                </td>
                <td>
                  {p.promo?.active ? (
                    <span className="badge badge-promo">
                      −{money(p.promo.value)}
                      {p.promo.mode === "percent" ? "%" : "₾"}
                    </span>
                  ) : (
                    <span className="hint">—</span>
                  )}
                </td>
                <td>
                  <span className={p.active ? "badge badge-on" : "badge badge-off"}>
                    {p.active ? "ჩართული" : "გამორთული"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
