import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateProduct } from "../../actions";
import { i18nOf, money, num } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function ProductEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const p = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      sizes: { orderBy: { sortOrder: "asc" } },
      promo: true,
      ingredients: { include: { topping: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p) notFound();

  const name = i18nOf(p.name);
  const desc = i18nOf(p.description);
  const badge = i18nOf(p.badge);

  const save = updateProduct.bind(null, id);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{name.ka || name.en}</h1>
          <p>
            {i18nOf(p.category.name).ka} · {p.type}
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/products">
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
            <label htmlFor="desc_en">აღწერა (EN)</label>
            <textarea id="desc_en" name="desc_en" defaultValue={desc.en} />
          </div>
          <div className="field">
            <label htmlFor="desc_ka">აღწერა (KA)</label>
            <textarea id="desc_ka" name="desc_ka" defaultValue={desc.ka} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="badge_en">ბეიჯი (EN)</label>
            <input id="badge_en" name="badge_en" type="text" defaultValue={badge.en} />
            <span className="hint">ცარიელი = ბეიჯის გარეშე</span>
          </div>
          <div className="field">
            <label htmlFor="badge_ka">ბეიჯი (KA)</label>
            <input id="badge_ka" name="badge_ka" type="text" defaultValue={badge.ka} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="photo">ფოტოს ბმული</label>
          <input id="photo" name="photo" type="text" defaultValue={p.photo ?? ""} />
        </div>

        {/* ── ფასი ── */}
        {p.sizes.length > 0 ? (
          <div className="field">
            <label>ფასი ზომების მიხედვით (₾)</label>
            <div className="field-row" style={{ gridTemplateColumns: `repeat(${p.sizes.length}, 1fr)` }}>
              {p.sizes.map((s) => (
                <div className="field" key={s.id}>
                  <label htmlFor={`size_${s.key}`}>
                    {s.key} {s.cm ? `· ${s.cm}სმ` : ""}
                  </label>
                  <input
                    id={`size_${s.key}`}
                    name={`size_${s.key}`}
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={money(s.price)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="price">ფასი (₾)</label>
            <input id="price" name="price" type="number" step="0.01" min="0" defaultValue={money(p.price)} />
          </div>
        )}

        {/* ── აქცია ── */}
        <div className="field">
          <label>აქცია</label>
          <div className="field-check">
            <input id="promo_active" name="promo_active" type="checkbox" defaultChecked={!!p.promo?.active} />
            <label htmlFor="promo_active">აქცია ჩართულია</label>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="promo_mode">ტიპი</label>
              <select id="promo_mode" name="promo_mode" defaultValue={p.promo?.mode ?? "percent"}>
                <option value="percent">პროცენტი (%)</option>
                <option value="fixed">ფიქსირებული (₾)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="promo_value">ოდენობა</label>
              <input
                id="promo_value"
                name="promo_value"
                type="number"
                step="0.01"
                min="0"
                defaultValue={p.promo ? num(p.promo.value) : ""}
              />
            </div>
          </div>
          <span className="hint">აქციაზე მომხმარებლის ფასდაკლება არ ვრცელდება.</span>
        </div>

        {/* ── სტატუსი ── */}
        <div className="field-row">
          <div className="field">
            <label htmlFor="sortOrder">რიგითობა</label>
            <input id="sortOrder" name="sortOrder" type="number" defaultValue={p.sortOrder} />
          </div>
          <div className="field" style={{ alignContent: "end" }}>
            <div className="field-check">
              <input id="active" name="active" type="checkbox" defaultChecked={p.active} />
              <label htmlFor="active">ჩართული (ჩანს მენიუში)</label>
            </div>
            <div className="field-check">
              <input id="discountable" name="discountable" type="checkbox" defaultChecked={p.discountable} />
              <label htmlFor="discountable">ფასდაკლება ვრცელდება</label>
            </div>
          </div>
        </div>

        {p.ingredients.length > 0 && (
          <div className="field">
            <label>ნაგულისხმევი ინგრედიენტები</label>
            <span className="hint">
              {p.ingredients.map((i) => i18nOf(i.topping.name).ka).join(", ")}
            </span>
          </div>
        )}

        <div className="form-actions">
          <button className="btn" type="submit">
            შენახვა
          </button>
          <Link className="btn btn-ghost" href="/admin/products">
            გაუქმება
          </Link>
        </div>
      </form>
    </>
  );
}
