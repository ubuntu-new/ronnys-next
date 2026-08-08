import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { i18nOf, i18nText, money, num } from "@/lib/admin-utils";
import { updateProductFull, archiveProduct } from "../actions";
import ImageField from "../../_components/ImageField";
import ArchiveButton from "../../_components/ArchiveButton";

export const dynamic = "force-dynamic";

const TYPES = [
  { v: "pizza", l: "პიცა (ზომებით)" },
  { v: "item", l: "ჩვეულებრივი" },
  { v: "sticks", l: "ჯოხები / კონსტრუქტორი" },
  { v: "drink", l: "სასმელი" },
  { v: "merch", l: "მერჩი" },
];

function nutritionOf(v: unknown) {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return {
    calories: o.calories ?? "",
    protein: o.protein ?? "",
    carbs: o.carbs ?? "",
    fat: o.fat ?? "",
    allergens: Array.isArray(o.allergens) ? (o.allergens as string[]).join(", ") : "",
  };
}

export default async function ProductEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [p, categories, toppings, branches, orderCount, comboSlots] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        category: true,
        sizes: { orderBy: { sortOrder: "asc" } },
        promo: true,
        ingredients: true,
      },
    }),
    db.category.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" }, include: { subcategories: true } }),
    db.topping.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    db.branch.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    db.orderItem.count({ where: { productId: id } }),
    db.comboSlotOption.findMany({
      where: { productId: id },
      include: { slot: { include: { combo: true } } },
    }),
  ]);
  if (!p) notFound();

  const name = i18nOf(p.name);
  const desc = i18nOf(p.description);
  const badge = i18nOf(p.badge);
  const nut = nutritionOf(p.nutrition);
  const chosenIngs = new Set(p.ingredients.map((i) => i.toppingId));
  const disabled = new Set(p.disabledBranches);
  const promoSizes = new Set(p.promo?.sizes ?? []);

  const save = updateProductFull.bind(null, id);
  const archive = archiveProduct.bind(null, id);

  const combosUsing = Array.from(
    new Set(comboSlots.map((o) => i18nOf(o.slot.combo.name).ka || i18nOf(o.slot.combo.name).en)),
  );

  const consequences = [
    "მენიუდან და ადმინის სიებიდან გაქრება — ვიზიტორი ვეღარ შეუკვეთავს.",
    orderCount > 0
      ? `${orderCount} შეკვეთაში ფიგურირებს — ის შეკვეთები ხელუხლებელი რჩება (მათში პროდუქტის ასლია შენახული).`
      : "არცერთ შეკვეთაში არ ფიგურირებს.",
    combosUsing.length > 0
      ? `შედის კომბოებში: ${combosUsing.join(", ")} — იქიდანაც გაქრება, კომბო კი დარჩება.`
      : "არცერთ კომბოში არ შედის.",
  ];

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{name.ka || name.en}</h1>
          <p>
            {i18nText(p.category.name)} · {p.type}
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/products">
          ← სია
        </Link>
      </div>

      <form className="admin-form" action={save} style={{ maxWidth: 900 }}>
        {/* ── ძირითადი ── */}
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
              <label htmlFor="categoryId">კატეგორია</label>
              <select id="categoryId" name="categoryId" defaultValue={p.categoryId}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {i18nText(c.name)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="subcategoryId">ქვე-კატეგორია</label>
              <select id="subcategoryId" name="subcategoryId" defaultValue={p.subcategoryId ?? ""}>
                <option value="">—</option>
                {categories.flatMap((c) =>
                  c.subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {i18nText(c.name)} › {i18nText(s.name)}
                    </option>
                  )),
                )}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="type">ტიპი</label>
              <select id="type" name="type" defaultValue={p.type}>
                {TYPES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tier">კლასი (tier)</label>
              <input id="tier" name="tier" type="text" defaultValue={p.tier ?? ""} placeholder="standard / house" />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="badge_en">ბეიჯი (EN)</label>
              <input id="badge_en" name="badge_en" type="text" defaultValue={badge.en} />
            </div>
            <div className="field">
              <label htmlFor="badge_ka">ბეიჯი (KA)</label>
              <input id="badge_ka" name="badge_ka" type="text" defaultValue={badge.ka} />
            </div>
          </div>
        </div>

        {/* ── ფოტო ── */}
        <div className="admin-panel">
          <h2>ფოტო</h2>
          <ImageField name="photo" label="მთავარი ფოტო" defaultValue={p.photo} />
          <div className="field">
            <label htmlFor="gallery">გალერეა (თითო ბმული ახალ ხაზზე)</label>
            <textarea id="gallery" name="gallery" defaultValue={p.gallery.join("\n")} style={{ minHeight: 90 }} />
          </div>
        </div>

        {/* ── ფასი ── */}
        <div className="admin-panel">
          <h2>ფასი</h2>

          {p.sizes.length > 0 && (
            <table className="admin-table" style={{ marginBottom: 16 }}>
              <thead>
                <tr>
                  <th style={{ width: 90 }}>ზომა</th>
                  <th style={{ width: 90 }}>სმ</th>
                  <th style={{ width: 110 }}>ფასი (₾)</th>
                  <th style={{ width: 90 }}>რიგი</th>
                  <th style={{ width: 70 }}>წაშლა</th>
                </tr>
              </thead>
              <tbody>
                {p.sizes.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <input name={`size_${s.id}_key`} type="text" defaultValue={s.key} style={inp} />
                    </td>
                    <td>
                      <input name={`size_${s.id}_cm`} type="number" defaultValue={s.cm ?? ""} style={inp} />
                    </td>
                    <td>
                      <input name={`size_${s.id}_price`} type="number" step="0.01" min="0" defaultValue={money(s.price)} style={inp} />
                    </td>
                    <td>
                      <input name={`size_${s.id}_order`} type="number" defaultValue={s.sortOrder} style={inp} />
                    </td>
                    <td>
                      <input type="checkbox" name={`size_${s.id}_del`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="field">
            <label>ახალი ზომის დამატება</label>
            <div className="field-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <input name="newsize_key" type="text" placeholder="ზომა (მაგ. XXL)" />
              <input name="newsize_cm" type="number" placeholder="სმ" />
              <input name="newsize_price" type="number" step="0.01" min="0" placeholder="ფასი" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="price">ერთიანი ფასი (₾)</label>
            <input id="price" name="price" type="number" step="0.01" min="0" defaultValue={p.price ? money(p.price) : ""} />
            <span className="hint">გამოიყენე მაშინ, როცა ზომები არ აქვს. ცარიელი = ზომებით იყიდება.</span>
          </div>
        </div>

        {/* ── ინგრედიენტები ── */}
        <div className="admin-panel">
          <h2>ნაგულისხმევი ინგრედიენტები ({chosenIngs.size})</h2>
          <input type="hidden" name="ings_present" value="1" />
          <div style={grid}>
            {toppings.map((t) => (
              <label key={t.id} style={cell}>
                <input type="checkbox" name="ing" value={t.id} defaultChecked={chosenIngs.has(t.id)} />
                <span>
                  {i18nText(t.name)}
                  {t.recipeOnly && <span className="hint"> · რეცეპტი</span>}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ── აქცია ── */}
        <div className="admin-panel">
          <h2>აქცია</h2>
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
              <input id="promo_value" name="promo_value" type="number" step="0.01" min="0" defaultValue={p.promo ? num(p.promo.value) : ""} />
            </div>
          </div>
          {p.sizes.length > 0 && (
            <div className="field">
              <label>რომელ ზომებზე</label>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {p.sizes.map((s) => (
                  <label key={s.id} style={cell}>
                    <input type="checkbox" name="promo_size" value={s.key} defaultChecked={promoSizes.has(s.key)} />
                    <span>{s.key}</span>
                  </label>
                ))}
              </div>
              <span className="hint">არცერთი მონიშნული = ყველა ზომაზე.</span>
            </div>
          )}
        </div>

        {/* ── ხელმისაწვდომობა ── */}
        <div className="admin-panel">
          <h2>ხელმისაწვდომობა ფილიალებში</h2>
          <input type="hidden" name="branches_present" value="1" />
          <div style={grid}>
            {branches.map((b) => (
              <label key={b.id} style={cell}>
                <input type="checkbox" name="availableIn" value={b.id} defaultChecked={!disabled.has(b.id)} />
                <span>
                  {i18nText(b.name)} <span className="hint">· {b.code}</span>
                </span>
              </label>
            ))}
          </div>
          <span className="hint">მოხსნილი = ამ ფილიალში არ იყიდება.</span>
        </div>

        {/* ── კვებითი ღირებულება ── */}
        <div className="admin-panel">
          <h2>კვებითი ღირებულება</h2>
          <div className="field-row" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
            <div className="field">
              <label htmlFor="calories">კალორია</label>
              <input id="calories" name="calories" type="number" step="0.1" defaultValue={String(nut.calories)} />
            </div>
            <div className="field">
              <label htmlFor="protein">ცილა (გ)</label>
              <input id="protein" name="protein" type="number" step="0.1" defaultValue={String(nut.protein)} />
            </div>
            <div className="field">
              <label htmlFor="carbs">ნახშირწყალი (გ)</label>
              <input id="carbs" name="carbs" type="number" step="0.1" defaultValue={String(nut.carbs)} />
            </div>
            <div className="field">
              <label htmlFor="fat">ცხიმი (გ)</label>
              <input id="fat" name="fat" type="number" step="0.1" defaultValue={String(nut.fat)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="allergens">ალერგენები (მძიმით)</label>
            <input id="allergens" name="allergens" type="text" defaultValue={nut.allergens} placeholder="gluten, dairy" />
          </div>
        </div>

        {/* ── სტატუსი ── */}
        <div className="admin-panel">
          <h2>სტატუსი</h2>
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
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შენახვა
          </button>
          <Link className="btn btn-ghost" href="/admin/products">
            გაუქმება
          </Link>
        </div>
      </form>

      <div className="admin-panel" style={{ maxWidth: 900, marginTop: 20 }}>
        <h2>არქივი</h2>
        <p className="hint" style={{ marginBottom: 12 }}>
          დროებით მენიუდან მოსაშორებლად ჯობია უბრალოდ <b>გამორთო</b> (ზემოთ, „ჩართული“).
          არქივი მაშინაა საჭირო, როცა პროდუქტი აღარ გამოიყენება.
        </p>
        <ArchiveButton action={archive} subject={name.ka || name.en} consequences={consequences} />
      </div>
    </>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--a-line)",
  borderRadius: 6,
  font: "inherit",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 6,
  maxHeight: 300,
  overflowY: "auto",
  border: "1px solid var(--a-line)",
  borderRadius: 8,
  padding: "10px 12px",
};

const cell: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
};
