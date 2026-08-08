import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { i18nOf, i18nText, money, num } from "@/lib/admin-utils";
import { updateCombo, addComboSlot, archiveCombo } from "../actions";
import ImageField from "../../_components/ImageField";
import ArchiveButton from "../../_components/ArchiveButton";

export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 14 };
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
  gap: 6,
  maxHeight: 260,
  overflowY: "auto",
  border: "1px solid var(--a-line)",
  borderRadius: 8,
  padding: "10px 12px",
};

function dateVal(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function ComboEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [c, products, branches] = await Promise.all([
    db.combo.findUnique({
      where: { id },
      include: { slots: { orderBy: { sortOrder: "asc" }, include: { options: true } } },
    }),
    db.product.findMany({
      where: { deletedAt: null },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
      include: { category: true },
    }),
    db.branch.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!c) notFound();

  const name = i18nOf(c.name);
  const desc = i18nOf(c.description);
  const badge = i18nOf(c.badge);
  const disabled = new Set(c.disabledBranches);

  const save = updateCombo.bind(null, id);
  const addSlot = addComboSlot.bind(null, id);
  const archive = archiveCombo.bind(null, id);

  const consequences = [
    "მენიუს „კომბო და აქციები“ ბლოკიდან გაქრება.",
    `${c.slots.length} სლოტი და მათი პროდუქტების არჩევანი შენარჩუნდება — დაბრუნებისას ისევე იმუშავებს.`,
    "ძველი შეკვეთები, სადაც ეს კომბო აირჩიეს, უცვლელი რჩება.",
    "პროდუქტები, რომლებიც ამ კომბოში შედის, არ ზარალდება.",
  ];

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{name.ka || name.en}</h1>
          <p>კომბო · {c.slots.length} სლოტი</p>
        </div>
        <Link className="btn btn-ghost" href="/admin/combos">
          ← სია
        </Link>
      </div>

      <form className="admin-form" action={save} style={{ maxWidth: 900 }}>
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
        </div>

        <div className="admin-panel">
          <h2>ფოტო</h2>
          <ImageField name="photo" defaultValue={c.photo} />
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

        {c.slots.map((s, i) => {
          const chosen = new Set(s.options.map((o) => o.productId));
          const label = i18nOf(s.label);
          return (
            <div className="admin-panel" key={s.id}>
              <h2>
                სლოტი {i + 1} <span className="hint">· {chosen.size} მონიშნული</span>
              </h2>
              <input type="hidden" name={`slot_${s.id}_present`} value="1" />

              <div className="field-row">
                <div className="field">
                  <label>ლეიბლი (EN)</label>
                  <input name={`slot_${s.id}_label_en`} type="text" defaultValue={label.en} />
                </div>
                <div className="field">
                  <label>ლეიბლი (KA)</label>
                  <input name={`slot_${s.id}_label_ka`} type="text" defaultValue={label.ka} />
                </div>
              </div>

              <div className="field-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                <div className="field">
                  <label>რეჟიმი</label>
                  <select name={`slot_${s.id}_mode`} defaultValue={s.mode}>
                    <option value="choice">არჩევანი</option>
                    <option value="fixed">ფიქსირებული</option>
                  </select>
                </div>
                <div className="field">
                  <label>რიგი</label>
                  <input name={`slot_${s.id}_order`} type="number" defaultValue={s.sortOrder} />
                </div>
                <div className="field" style={{ alignContent: "end" }}>
                  <div className="field-check">
                    <input type="checkbox" name={`slot_${s.id}_del`} />
                    <label>ამ სლოტის წაშლა</label>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>პროდუქტები</label>
                <div style={grid}>
                  {products.map((p) => (
                    <label key={p.id} style={cell}>
                      <input type="checkbox" name={`slot_${s.id}_opt`} value={p.id} defaultChecked={chosen.has(p.id)} />
                      <span>
                        {i18nText(p.name)}
                        <span className="hint"> · {i18nText(p.category.name)}</span>
                        {!p.active && <span className="hint"> · გამორთული</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

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
        </div>

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

      <form action={addSlot} style={{ marginTop: 16 }}>
        <button className="btn btn-ghost" type="submit">
          + სლოტის დამატება
        </button>
      </form>

      <div className="admin-panel" style={{ maxWidth: 900, marginTop: 20 }}>
        <h2>არქივი</h2>
        <p className="hint" style={{ marginBottom: 12 }}>
          სეზონური აქციისთვის ჯობია <b>ვადის</b> მითითება ან <b>გამორთვა</b> — არქივი მაშინ, როცა
          კომბო აღარ გამოიყენება.
        </p>
        <ArchiveButton action={archive} subject={name.ka || name.en} consequences={consequences} />
      </div>
    </>
  );
}
