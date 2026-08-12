import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/admin-auth";
import { i18nText } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getSession();

  const [products, inactive, promos, toppings, combos, branches, orders, archived] = await Promise.all([
    db.product.count({ where: { deletedAt: null } }),
    db.product.count({ where: { deletedAt: null, active: false } }),
    db.productPromo.count({ where: { active: true } }),
    db.topping.count({ where: { deletedAt: null, active: true } }),
    db.combo.count({ where: { deletedAt: null, active: true } }),
    db.branch.count({ where: { deletedAt: null, active: true } }),
    db.order.count(),
    db.product.count({ where: { deletedAt: { not: null } } }),
  ]);

  const recent = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 6,
    select: { id: true, name: true, updatedAt: true, active: true },
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>დაფა</h1>
          <p>გამარჯობა, {session?.name}</p>
        </div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat">
          <b>{products}</b>
          <span>პროდუქტი{inactive > 0 ? ` · ${inactive} გამორთული` : ""}</span>
        </div>
        <div className="admin-stat">
          <b>{promos}</b>
          <span>აქტიური აქცია</span>
        </div>
        <div className="admin-stat">
          <b>{toppings}</b>
          <span>ტოპინგი</span>
        </div>
        <div className="admin-stat">
          <b>{combos}</b>
          <span>კომბო</span>
        </div>
        <div className="admin-stat">
          <b>{branches}</b>
          <span>ფილიალი</span>
        </div>
        <div className="admin-stat">
          <b>{orders}</b>
          <span>შეკვეთა</span>
        </div>
        <div className="admin-stat">
          <b>{archived}</b>
          <span>არქივში</span>
        </div>
      </div>

      <div className="admin-panel">
        <h2>ბოლოს განახლებული</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>დასახელება</th>
              <th>სტატუსი</th>
              <th>განახლდა</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/products/${p.id}`}>{i18nText(p.name)}</Link>
                </td>
                <td>
                  <span className={p.active ? "badge badge-on" : "badge badge-off"}>
                    {p.active ? "ჩართული" : "გამორთული"}
                  </span>
                </td>
                <td>{new Date(p.updatedAt).toLocaleString("ka-GE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
