import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import {
  restoreProduct,
  restoreTopping,
  restoreCombo,
  restoreBranch,
  restoreCategory,
  restoreSubcategory,
  restoreEmployee,
  restoreDiscount,
} from "./actions";

export const dynamic = "force-dynamic";

function when(d: Date | null) {
  return d ? new Date(d).toLocaleString("ka-GE") : "—";
}

function RestoreButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button className="btn btn-ghost" type="submit">
        დაბრუნება
      </button>
    </form>
  );
}

export default async function ArchivePage() {
  const [products, toppings, combos, branches, categories, subcategories, employees, discounts] =
    await Promise.all([
    db.product.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: { category: true },
    }),
    db.topping.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
    db.combo.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
    db.branch.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
    db.category.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
    db.subcategory.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: { category: true },
    }),
    db.employee.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
    db.discount.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
  ]);

  const total =
    products.length +
    toppings.length +
    combos.length +
    branches.length +
    categories.length +
    subcategories.length +
    employees.length +
    discounts.length;

  const sections = [
    {
      title: "პროდუქტები",
      rows: products.map((p) => ({
        id: p.id,
        name: i18nText(p.name),
        note: i18nText(p.category.name),
        at: p.deletedAt,
        active: p.active,
        action: restoreProduct.bind(null, p.id),
      })),
    },
    {
      title: "ტოპინგები",
      rows: toppings.map((t) => ({
        id: t.id,
        name: i18nText(t.name),
        note: t.category ?? "—",
        at: t.deletedAt,
        active: t.active,
        action: restoreTopping.bind(null, t.id),
      })),
    },
    {
      title: "კომბოები",
      rows: combos.map((c) => ({
        id: c.id,
        name: i18nText(c.name),
        note: c.pricingMode === "fixed" ? "ფიქსირებული ფასი" : "ფასდაკლება",
        at: c.deletedAt,
        active: c.active,
        action: restoreCombo.bind(null, c.id),
      })),
    },
    {
      title: "კატეგორიები",
      rows: categories.map((c) => ({
        id: c.id,
        name: i18nText(c.name),
        note: c.type,
        at: c.deletedAt,
        active: c.active,
        action: restoreCategory.bind(null, c.id),
      })),
    },
    {
      title: "ქვე-კატეგორიები",
      rows: subcategories.map((s) => ({
        id: s.id,
        name: i18nText(s.name),
        note: i18nText(s.category.name),
        at: s.deletedAt,
        active: s.active,
        action: restoreSubcategory.bind(null, s.id),
      })),
    },
    {
      title: "ფილიალები",
      rows: branches.map((b) => ({
        id: b.id,
        name: i18nText(b.name),
        note: b.code,
        at: b.deletedAt,
        active: b.active,
        action: restoreBranch.bind(null, b.id),
      })),
    },
    {
      title: "თანამშრომლები",
      rows: employees.map((e) => ({
        id: e.id,
        name: e.name,
        note: e.role,
        at: e.deletedAt,
        active: e.active,
        action: restoreEmployee.bind(null, e.id),
      })),
    },
    {
      title: "ფასდაკლებები",
      rows: discounts.map((d) => ({
        id: d.id,
        name: i18nText(d.name),
        note: d.type,
        at: d.deletedAt,
        active: d.active,
        action: restoreDiscount.bind(null, d.id),
      })),
    },
  ].filter((s) => s.rows.length > 0);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>არქივი</h1>
          <p>{total} ჩანაწერი</p>
        </div>
      </div>

      <div className="admin-panel">
        <h2>როგორ მუშაობს</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: "var(--a-muted)" }}>
          <li>ბაზიდან არაფერი იშლება — არქივში გადატანილი ჩანაწერი უბრალოდ იმალება სიებიდან.</li>
          <li>დაბრუნებისას ჩართულობის სტატუსი უცვლელი რჩება: თუ არქივამდე ჩართული იყო, ჩართული დაბრუნდება.</li>
          <li>შეკვეთების ისტორია არასდროს ზარალდება — მასში პროდუქტების ასლებია შენახული.</li>
        </ul>
      </div>

      {total === 0 && (
        <div className="admin-panel">
          <p className="hint" style={{ margin: 0 }}>
            არქივი ცარიელია.
          </p>
        </div>
      )}

      {sections.map((sec) => (
        <div className="admin-panel" key={sec.title}>
          <h2>
            {sec.title} <span className="hint">· {sec.rows.length}</span>
          </h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>დასახელება</th>
                <th></th>
                <th>დაბრუნებისას</th>
                <th>არქივში</th>
                <th style={{ width: 130 }}></th>
              </tr>
            </thead>
            <tbody>
              {sec.rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>
                    <span className="hint">{r.note}</span>
                  </td>
                  <td>
                    <span className={r.active ? "badge badge-on" : "badge badge-off"}>
                      {r.active ? "ჩაირთვება" : "გამორთული დარჩება"}
                    </span>
                  </td>
                  <td>
                    <span className="hint">{when(r.at)}</span>
                  </td>
                  <td>
                    <RestoreButton action={r.action} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
