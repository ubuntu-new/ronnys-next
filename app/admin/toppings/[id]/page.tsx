import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { i18nOf, money } from "@/lib/admin-utils";
import { updateTopping } from "../actions";

export const dynamic = "force-dynamic";

const GROUPS = ["cheese", "protein", "veg", "heat"];

export default async function ToppingEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const t = await db.topping.findUnique({
    where: { id },
    include: {
      prices: { orderBy: { sizeKey: "asc" } },
      products: { include: { product: true } },
    },
  });
  if (!t) notFound();

  const name = i18nOf(t.name);
  const save = updateTopping.bind(null, id);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{name.ka || name.en}</h1>
          <p>ტოპინგი</p>
        </div>
        <Link className="btn btn-ghost" href="/admin/toppings">
          ← სია
        </Link>
      </div>

      <form className="admin-panel admin-form" action={save}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="name_en">დასახელება (EN)</label>
            <input id="name_en" name="name_en" type="text" defaultValue={name.en} required />
          </div>
          <div className="field">
            <label htmlFor="name_ka">დასახელება (KA)</label>
            <input id="name_ka" name="name_ka" type="text" defaultValue={name.ka} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="category">ჯგუფი</label>
            <select id="category" name="category" defaultValue={t.category ?? ""}>
              <option value="">—</option>
              {GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sortOrder">რიგითობა</label>
            <input id="sortOrder" name="sortOrder" type="number" defaultValue={t.sortOrder} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="photo">ფოტოს ბმული</label>
          <input id="photo" name="photo" type="text" defaultValue={t.photo ?? ""} />
        </div>

        <div className="field">
          <label>ფასი ზომების მიხედვით (₾)</label>
          <div className="field-row" style={{ gridTemplateColumns: `repeat(${t.prices.length}, 1fr)` }}>
            {t.prices.map((p) => (
              <div className="field" key={p.id}>
                <label htmlFor={`price_${p.sizeKey}`}>{p.sizeKey}</label>
                <input
                  id={`price_${p.sizeKey}`}
                  name={`price_${p.sizeKey}`}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={money(p.price)}
                />
              </div>
            ))}
          </div>
          <span className="hint">0 = უფასო დანამატი (მაგ. სანელებლები).</span>
        </div>

        <div className="field">
          <div className="field-check">
            <input id="active" name="active" type="checkbox" defaultChecked={t.active} />
            <label htmlFor="active">ჩართული</label>
          </div>
          <div className="field-check">
            <input id="recipeOnly" name="recipeOnly" type="checkbox" defaultChecked={t.recipeOnly} />
            <label htmlFor="recipeOnly">მხოლოდ რეცეპტში (დამატებით არ იყიდება)</label>
          </div>
        </div>

        {t.products.length > 0 && (
          <div className="field">
            <label>გამოიყენება პროდუქტებში</label>
            <span className="hint">
              {t.products.map((p) => i18nOf(p.product.name).ka).join(", ")}
            </span>
          </div>
        )}

        <div className="form-actions">
          <button className="btn" type="submit">
            შენახვა
          </button>
          <Link className="btn btn-ghost" href="/admin/toppings">
            გაუქმება
          </Link>
        </div>
      </form>
    </>
  );
}
