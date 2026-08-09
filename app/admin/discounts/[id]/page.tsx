import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { i18nOf, i18nText, num } from "@/lib/admin-utils";
import { updateDiscount, archiveDiscount } from "../actions";
import ArchiveButton from "../../_components/ArchiveButton";

export const dynamic = "force-dynamic";

const inp: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--a-line)",
  borderRadius: 6,
  font: "inherit",
};

function dateVal(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function DiscountEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [d, categories, products] = await Promise.all([
    db.discount.findUnique({
      where: { id },
      include: {
        rules: {
          include: { targetCategory: true, targetSubcat: true, targetProduct: true },
        },
        _count: { select: { users: true } },
      },
    }),
    db.category.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: { subcategories: { where: { deletedAt: null } } },
    }),
    db.product.findMany({
      where: { deletedAt: null },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
      include: { category: true },
    }),
  ]);
  if (!d) notFound();

  const name = i18nOf(d.name);
  const save = updateDiscount.bind(null, id);
  const archive = archiveDiscount.bind(null, id);

  const ruleTarget = (r: (typeof d.rules)[number]) => {
    if (r.targetProduct) return `პროდუქტი · ${i18nText(r.targetProduct.name)}`;
    if (r.targetSubcat) return `ქვე-კატეგორია · ${i18nText(r.targetSubcat.name)}`;
    if (r.targetCategory) return `კატეგორია · ${i18nText(r.targetCategory.name)}`;
    return "—";
  };

  const consequences = [
    "ახალ შეკვეთებზე აღარ გამოიყენება.",
    d._count.users > 0
      ? `${d._count.users} მომხმარებელს აქვს მიბმული — კავშირი რჩება, მაგრამ ფასდაკლება აღარ ჩაითვლება.`
      : "მომხმარებლებზე მიბმული არ არის.",
    `${d.rules.length} წესი შენარჩუნდება — დაბრუნებისას ისევე იმუშავებს.`,
    "უკვე გაცემული ფასდაკლებები ძველ შეკვეთებში უცვლელი რჩება.",
  ];

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{name.ka || name.en}</h1>
          <p>
            {d.type} · {d.rules.length} წესი
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/discounts">
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
              <label htmlFor="type">ტიპი</label>
              <select id="type" name="type" defaultValue={d.type}>
                <option value="student">სტუდენტი</option>
                <option value="diplomatic">დიპლომატიური</option>
                <option value="employee">თანამშრომელი</option>
                <option value="loyalty">ლოიალობა</option>
                <option value="promo">პრომო</option>
                <option value="custom">სხვა</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="usageLimit">გამოყენების ლიმიტი</label>
              <input id="usageLimit" name="usageLimit" type="number" min="0" defaultValue={d.usageLimit ?? ""} />
              <span className="hint">ცარიელი = შეუზღუდავი. გამოყენებულია: {d.usedCount}</span>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="defaultMode">ნაგულისხმევი ტიპი</label>
              <select id="defaultMode" name="defaultMode" defaultValue={d.defaultMode}>
                <option value="percent">პროცენტი (%)</option>
                <option value="fixed">ფიქსირებული (₾)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="defaultValue">ნაგულისხმევი ოდენობა</label>
              <input
                id="defaultValue"
                name="defaultValue"
                type="number"
                step="0.01"
                min="0"
                defaultValue={num(d.defaultValue)}
              />
              <span className="hint">გამოიყენება, როცა პოზიციას კონკრეტული წესი არ მოერგო.</span>
            </div>
          </div>
        </div>

        {/* ── წესები ── */}
        <div className="admin-panel">
          <h2>წესები</h2>
          <p className="hint" style={{ marginTop: -8, marginBottom: 14 }}>
            პრიორიტეტი: <b>პროდუქტი → ქვე-კატეგორია → კატეგორია → ნაგულისხმევი</b>.
          </p>

          {d.rules.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>რაზე ვრცელდება</th>
                  <th style={{ width: 150 }}>ტიპი</th>
                  <th style={{ width: 110 }}>ოდენობა</th>
                  <th style={{ width: 70 }}>წაშლა</th>
                </tr>
              </thead>
              <tbody>
                {d.rules.map((r) => (
                  <tr key={r.id}>
                    <td>{ruleTarget(r)}</td>
                    <td>
                      <select name={`rule_${r.id}_mode`} defaultValue={r.mode} style={inp}>
                        <option value="percent">%</option>
                        <option value="fixed">₾</option>
                      </select>
                    </td>
                    <td>
                      <input
                        name={`rule_${r.id}_value`}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={num(r.value)}
                        style={inp}
                      />
                    </td>
                    <td>
                      <input type="checkbox" name={`rule_${r.id}_del`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="field" style={{ marginTop: 16 }}>
            <label>ახალი წესი</label>
            <div className="field-row" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
              <select name="newrule_target" defaultValue="">
                <option value="">— აირჩიე —</option>
                <optgroup label="კატეგორია">
                  {categories.map((c) => (
                    <option key={c.id} value={`cat:${c.id}`}>
                      {i18nText(c.name)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="ქვე-კატეგორია">
                  {categories.flatMap((c) =>
                    c.subcategories.map((s) => (
                      <option key={s.id} value={`sub:${s.id}`}>
                        {i18nText(c.name)} › {i18nText(s.name)}
                      </option>
                    )),
                  )}
                </optgroup>
                <optgroup label="პროდუქტი">
                  {products.map((p) => (
                    <option key={p.id} value={`prod:${p.id}`}>
                      {i18nText(p.name)} · {i18nText(p.category.name)}
                    </option>
                  ))}
                </optgroup>
              </select>
              <select name="newrule_mode" defaultValue="percent">
                <option value="percent">პროცენტი (%)</option>
                <option value="fixed">ფიქსირებული (₾)</option>
              </select>
              <input name="newrule_value" type="number" step="0.01" min="0" placeholder="ოდენობა" />
            </div>
          </div>
        </div>

        <div className="admin-panel">
          <h2>ვადა და სტატუსი</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="validFrom">მოქმედებს დან</label>
              <input id="validFrom" name="validFrom" type="date" defaultValue={dateVal(d.validFrom)} />
            </div>
            <div className="field">
              <label htmlFor="validTo">მოქმედებს მდე</label>
              <input id="validTo" name="validTo" type="date" defaultValue={dateVal(d.validTo)} />
            </div>
          </div>
          <div className="field-check">
            <input
              id="requiresVerification"
              name="requiresVerification"
              type="checkbox"
              defaultChecked={d.requiresVerification}
            />
            <label htmlFor="requiresVerification">ვერიფიკაცია სავალდებულოა</label>
          </div>
          <div className="field-check">
            <input id="active" name="active" type="checkbox" defaultChecked={d.active} />
            <label htmlFor="active">აქტიური</label>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შენახვა
          </button>
          <Link className="btn btn-ghost" href="/admin/discounts">
            გაუქმება
          </Link>
        </div>
      </form>

      <div className="admin-panel" style={{ maxWidth: 900, marginTop: 20 }}>
        <h2>არქივი</h2>
        <p className="hint" style={{ marginBottom: 12 }}>
          სეზონურისთვის ჯობია <b>ვადის</b> მითითება ან <b>გამორთვა</b>.
        </p>
        <ArchiveButton action={archive} subject={name.ka || name.en} consequences={consequences} />
      </div>
    </>
  );
}
