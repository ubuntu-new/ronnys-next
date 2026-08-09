import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { saveAvailability, enableEverywhere } from "./actions";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; cat?: string; only?: string }>;
}) {
  const sp = await searchParams;

  const [branches, categories, products] = await Promise.all([
    db.branch.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    db.category.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    db.product.findMany({
      where: { deletedAt: null, ...(sp.cat ? { categoryId: sp.cat } : {}) },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
      include: { category: true, branchProducts: true },
    }),
  ]);

  const offCount = (p: (typeof products)[number]) =>
    p.branchProducts.filter((bp) => !bp.available).length;

  const rows = sp.only === "off" ? products.filter((p) => offCount(p) > 0) : products;
  const totalOff = products.filter((p) => offCount(p) > 0).length;
  const totalGone = products.filter(
    (p) => branches.length > 0 && offCount(p) >= branches.length,
  ).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ხელმისაწვდომობა</h1>
          <p>
            {products.length} პროდუქტი × {branches.length} ფილიალი
            {totalOff > 0 && ` · ${totalOff} სადმე გამორთული`}
          </p>
        </div>
      </div>

      {sp.saved && (
        <div className="alert alert-ok">
          {sp.saved === "0" ? "ცვლილება არ იყო." : `შენახულია — ${sp.saved} ცვლილება.`}
        </div>
      )}

      {totalGone > 0 && (
        <div className="alert alert-error">
          <b>{totalGone} პროდუქტი არცერთ ფილიალში არ იყიდება</b> — ისინი საიტზე საერთოდ არ ჩანს.
        </div>
      )}

      <div className="admin-panel">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className={sp.cat || sp.only ? "btn btn-ghost" : "btn"} href="/admin/availability">
            ყველა
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              className={sp.cat === c.id ? "btn" : "btn btn-ghost"}
              href={`/admin/availability?cat=${c.id}`}
            >
              {i18nText(c.name)}
            </Link>
          ))}
          <Link
            className={sp.only === "off" ? "btn" : "btn btn-ghost"}
            href="/admin/availability?only=off"
          >
            მხოლოდ გამორთული
          </Link>
        </div>
      </div>

      <form action={saveAvailability}>
        <div className="admin-panel">
          <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
            მონიშნული = ამ ფილიალში იყიდება. მოხსნილი = „დღეს გათავდა“. ცვლილებები ერთდროულად ინახება.
          </p>

          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>პროდუქტი</th>
                  {branches.map((b) => (
                    <th key={b.id} style={{ width: 110, textAlign: "center" }}>
                      {i18nText(b.name)}
                      <div className="hint" style={{ fontWeight: 400 }}>
                        {b.code}
                      </div>
                    </th>
                  ))}
                  <th style={{ width: 130 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const off = new Set(
                    p.branchProducts.filter((bp) => !bp.available).map((bp) => bp.branchId),
                  );
                  const gone = branches.length > 0 && off.size >= branches.length;

                  return (
                    <tr key={p.id} style={gone ? { background: "#fffaf9" } : undefined}>
                      <td>
                        <input type="hidden" name="row" value={p.id} />
                        <Link href={`/admin/products/${p.id}`}>{i18nText(p.name)}</Link>
                        <div className="hint">
                          {i18nText(p.category.name)}
                          {!p.active && " · გამორთული"}
                          {gone && " · საიტზე არ ჩანს"}
                        </div>
                      </td>

                      {branches.map((b) => (
                        <td key={b.id} style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            name={`av_${p.id}`}
                            value={b.id}
                            defaultChecked={!off.has(b.id)}
                          />
                        </td>
                      ))}

                      <td>
                        {off.size > 0 && (
                          <span
                            className="badge"
                            style={
                              gone
                                ? { background: "#fdecea", color: "var(--a-danger)" }
                                : { background: "#fdf3d6", color: "#8a6a12" }
                            }
                          >
                            {gone ? "არსად" : `${off.size} გამორთული`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="form-actions" style={{ marginTop: 18 }}>
            <button className="btn" type="submit">
              შენახვა
            </button>
          </div>
        </div>
      </form>

      {totalOff > 0 && (
        <div className="admin-panel">
          <h2>სწრაფად ჩართვა ყველგან</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {products
              .filter((p) => offCount(p) > 0)
              .map((p) => {
                const on = enableEverywhere.bind(null, p.id);
                return (
                  <form key={p.id} action={on}>
                    <button className="btn btn-ghost" type="submit">
                      {i18nText(p.name)} ({offCount(p)})
                    </button>
                  </form>
                );
              })}
          </div>
        </div>
      )}

      <div className="admin-panel">
        <h2>შენიშვნა</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: "var(--a-muted)" }}>
          <li>
            ეს ცხრილი <b>დროებით</b> გათავებას აღწერს, არა სამუდამო მოხსნას — მისთვის პროდუქტის
            „ჩართული“ გადამრთველია.
          </li>
          <li>
            საიტზე პროდუქტი მაშინ ქრება, როცა <b>ყველა</b> ფილიალშია გამორთული. ფილიალის მიხედვით
            ფილტრაცია მაშინ ჩაირთვება, როცა საიტს ფილიალის არჩევა დაემატება.
          </li>
          <li>რაოდენობა და ავტომატური შევსება ამავე ცხრილზე დაშენდება — გადაკეთება არ დაგვჭირდება.</li>
        </ul>
      </div>
    </>
  );
}
