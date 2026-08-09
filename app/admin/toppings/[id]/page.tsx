import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { i18nOf, money } from "@/lib/admin-utils";
import { updateTopping, archiveTopping } from "../actions";
import ImageField from "../../_components/ImageField";
import ArchiveButton from "../../_components/ArchiveButton";

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
  const archive = archiveTopping.bind(null, id);

  const usedIn = t.products.map((x) => i18nOf(x.product.name).ka || i18nOf(x.product.name).en);
  const consequences = [
    "ტოპინგების სიიდან და კონსტრუქტორიდან გაქრება — ვეღარ დაამატებენ პიცაზე.",
    usedIn.length > 0
      ? `${usedIn.length} პროდუქტის რეცეპტშია (${usedIn.join(", ")}) — კავშირი რჩება, მაგრამ ინგრედიენტი აღარ გამოჩნდება.`
      : "არცერთი პროდუქტის რეცეპტში არ არის.",
    "ძველ შეკვეთებში, სადაც ეს ტოპინგი აირჩიეს, ყველაფერი უცვლელი რჩება.",
  ];

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

      <form className="admin-form" action={save} style={{ maxWidth: 820 }}>
        <div className="admin-panel">
          <h2>ძირითადი</h2>

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

          <div className="field-row">
            <div className="field">
              <label htmlFor="emoji">ემოჯი</label>
              <input id="emoji" name="emoji" type="text" defaultValue={t.emoji ?? ""} placeholder="🧀" />
            </div>
            <div className="field">
              <label htmlFor="dots">ნიშნულები (მძიმით)</label>
              <input id="dots" name="dots" type="text" defaultValue={t.dots.join(", ")} placeholder="cheese, veg" />
            </div>
          </div>
        </div>

        <div className="admin-panel">
          <h2>ფოტო</h2>
          <ImageField name="photo" defaultValue={t.photo} />
        </div>

        <div className="admin-panel">
          <h2>ფასი ზომების მიხედვით (₾)</h2>
          <div className="field-row" style={{ gridTemplateColumns: `repeat(${t.prices.length || 1}, 1fr)` }}>
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
          <div className="field" style={{ marginTop: 12 }}>
            <label>ახალი ზომის ფასი</label>
            <div className="field-row">
              <input name="newsize_key" type="text" placeholder="ზომა (მაგ. XXL)" />
              <input name="newsize_price" type="number" step="0.01" min="0" placeholder="ფასი" />
            </div>
          </div>
          <span className="hint">0 = უფასო დანამატი (მაგ. სანელებლები).</span>
        </div>

        <div className="admin-panel">
          <h2>სტატუსი</h2>
          <div className="field-check">
            <input id="active" name="active" type="checkbox" defaultChecked={t.active} />
            <label htmlFor="active">ჩართული</label>
          </div>
          <div className="field-check">
            <input id="recipeOnly" name="recipeOnly" type="checkbox" defaultChecked={t.recipeOnly} />
            <label htmlFor="recipeOnly">მხოლოდ რეცეპტში (დამატებით არ იყიდება)</label>
          </div>
          <div className="field-check">
            <input id="popular" name="popular" type="checkbox" defaultChecked={t.popular} />
            <label htmlFor="popular">პოპულარული (კონსტრუქტორში ზემოთ ჩნდება)</label>
          </div>

          {t.products.length > 0 && (
            <div className="field" style={{ marginTop: 12 }}>
              <label>გამოიყენება პროდუქტებში</label>
              <span className="hint">{t.products.map((p) => i18nOf(p.product.name).ka).join(", ")}</span>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შენახვა
          </button>
          <Link className="btn btn-ghost" href="/admin/toppings">
            გაუქმება
          </Link>
        </div>
      </form>

      <div className="admin-panel" style={{ maxWidth: 820, marginTop: 20 }}>
        <h2>არქივი</h2>
        <p className="hint" style={{ marginBottom: 12 }}>
          დროებით დასამალად ჯობია <b>გამორთვა</b>. არქივი — როცა ტოპინგი აღარ გამოიყენება.
        </p>
        <ArchiveButton action={archive} subject={name.ka || name.en} consequences={consequences} />
      </div>
    </>
  );
}
