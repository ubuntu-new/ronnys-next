import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { i18nOf, i18nText, money, num } from "@/lib/admin-utils";
import { updateCombo } from "../actions";

export const dynamic = "force-dynamic";

function dateVal(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function ComboEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const c = await db.combo.findUnique({
    where: { id },
    include: { slots: { orderBy: { sortOrder: "asc" }, include: { options: true } } },
  });
  if (!c) notFound();

  const products = await db.product.findMany({
    where: { active: true },
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
    include: { category: true },
  });

  const name = i18nOf(c.name);
  const desc = i18nOf(c.description);
  const badge = i18nOf(c.badge);
  const save = updateCombo.bind(null, id);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{name.ka || name.en}</h1>
          <p>კომბო</p>
        </div>
        <Link className="btn btn-ghost" href="/admin/combos">
          ← სია
        </Link>
      </div>

      <form className="admin-form" action={save} style={{ maxWidth: 860 }}>
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
              <label htmlFor="badge_en">ბეიჯი (EN)</label>
              <input id="badge_en" name="badge_en" type="text" defaultValue={badge.en} />
            </div>
            <div className="field">
              <label htmlFor="badge_ka">ბეიჯი (KA)</label>
              <input id="badge_ka" name="badge_ka" type="text" defaultValue={badge.ka} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="photo">ფოტოს ბმული</label>
            <input id="photo" name="photo" type="text" defaultValue={c.photo ?? ""} />
          </div>
        </div>

        <div className="admin-panel">
          <h2>ფასდადება</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="pricingMode">რეჟიმი</label>
              <select id="pricingMode" name="pricingMode" defaultValue={c.pricingMode}>
                <option value="fixed">ფიქსირებული ფასი</option>
                <option value="discount">ფასდაკლება ჯამზე (%)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="price">ფიქსირებული ფასი (₾)</label>
              <input id="price" name="price" type="number" step="0.01" min="0" defaultValue={c.price ? money(c.price) : ""} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="percent">ფასდაკლება (%)</label>
            <input id="percent" name="percent" type="number" step="0.01" min="0" max="100" defaultValue={c.percent ? num(c.percent) : ""} />
            <span className="hint">შეავსე მხოლოდ ის ველი, რომელიც არჩეულ რეჟიმს შეესაბამება.</span>
          </div>
        </div>

        {/* ── სლოტები ── */}
        {c.slots.map((s, i) => {
          const chosen = new Set(s.options.map((o) => o.productId));
          const label = i18nOf(s.label);
          return (
            <div className="admin-panel" key={s.id}>
              <h2>სლოტი {i + 1}</h2>
              <input type="hidden" name={`slot_${s.id}_present`} value="1" />

              <div className="field-row">
                <div className="field">
                  <label htmlFor={`slot_${s.id}_label_en`}>ლეიბლი (EN)</label>
                  <input
                    id={`slot_${s.id}_label_en`}
                    name={`slot_${s.id}_label_en`}
                    type="text"
                    defaultValue={label.en}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`slot_${s.id}_label_ka`}>ლეიბლი (KA)</label>
                  <input
                    id={`slot_${s.id}_label_ka`}
                    name={`slot_${s.id}_label_ka`}
                    type="text"
                    defaultValue={label.ka}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor={`slot_${s.id}_mode`}>რეჟიმი</label>
                <select id={`slot_${s.id}_mode`} name={`slot_${s.id}_mode`} defaultValue={s.mode}>
                  <option value="choice">არჩევანი (მომხმარებელი ირჩევს)</option>
                  <option value="fixed">ფიქსირებული (ერთი პროდუქტი)</option>
                </select>
              </div>

              <div className="field">
                <label>პროდუქტები ({chosen.size} მონიშნული)</label>
                <div
                  style={{
                    maxHeight: 260,
                    overflowY: "auto",
                    border: "1px solid var(--a-line)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                    gap: 6,
                  }}
                >
                  {products.map((p) => (
                    <label
                      key={p.id}
                      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}
                    >
                      <input
                        type="checkbox"
                        name={`slot_${s.id}_opt`}
                        value={p.id}
                        defaultChecked={chosen.has(p.id)}
                      />
                      <span>
                        {i18nText(p.name)}
                        <span className="hint"> · {i18nText(p.category.name)}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <span className="hint">
                  „ფიქსირებული" რეჟიმზე მონიშნე მხოლოდ ერთი პროდუქტი.
                </span>
              </div>
            </div>
          );
        })}

        <div className="admin-panel">
          <h2>ვადა და სტატუსი</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="validFrom">მოქმედებს დან</label>
              <input id="validFrom" name="validFrom" type="date" defaultValue={dateVal(c.validFrom)} />
            </div>
            <div className="field">
              <label htmlFor="validTo">მოქმედებს მდე</label>
              <input id="validTo" name="validTo" type="date" defaultValue={dateVal(c.validTo)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="sortOrder">რიგითობა</label>
              <input id="sortOrder" name="sortOrder" type="number" defaultValue={c.sortOrder} />
            </div>
            <div className="field" style={{ alignContent: "end" }}>
              <div className="field-check">
                <input id="active" name="active" type="checkbox" defaultChecked={c.active} />
                <label htmlFor="active">ჩართული</label>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შენახვა
          </button>
          <Link className="btn btn-ghost" href="/admin/combos">
            გაუქმება
          </Link>
        </div>
      </form>
    </>
  );
}
