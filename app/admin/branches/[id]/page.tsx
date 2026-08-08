import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { i18nOf } from "@/lib/admin-utils";
import { updateBranch, addTerminal, archiveBranch } from "../actions";
import ArchiveButton from "../../_components/ArchiveButton";

export const dynamic = "force-dynamic";

const inp: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--a-line)",
  borderRadius: 6,
  font: "inherit",
};

function hoursOf(v: unknown): { en: string; ka: string } {
  if (v && typeof v === "object" && "display" in (v as Record<string, unknown>)) {
    return i18nOf((v as Record<string, unknown>).display);
  }
  return { en: "", ka: "" };
}

export default async function BranchEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const b = await db.branch.findUnique({
    where: { id },
    include: { terminals: { orderBy: { posId: "asc" } }, _count: { select: { orders: true } } },
  });
  if (!b) notFound();

  const name = i18nOf(b.name);
  const address = i18nOf(b.address);
  const hours = hoursOf(b.hours);

  const save = updateBranch.bind(null, id);
  const addPos = addTerminal.bind(null, id);
  const archive = archiveBranch.bind(null, id);

  const consequences = [
    "საიტის ფილიალების სიიდან და შეკვეთის ფორმიდან გაქრება.",
    b._count.orders > 0
      ? `${b._count.orders} შეკვეთა რჩება ბაზაში და რეპორტებში — ისტორია არ ზარალდება.`
      : "შეკვეთები არ აქვს.",
    `${b.terminals.length} POS ტერმინალი შენარჩუნდება — POS ID-ები ისტორიისთვის საჭიროა.`,
    "თანამშრომლების მიბმა და ცვლების ჩანაწერები რჩება.",
  ];

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{name.ka || name.en}</h1>
          <p>
            <code>{b.code}</code> · {b.terminals.length} POS · {b._count.orders} შეკვეთა
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/branches">
          ← სია
        </Link>
      </div>

      <form className="admin-form" action={save} style={{ maxWidth: 900 }}>
        <div className="admin-panel">
          <h2>ძირითადი</h2>

          <div className="field-row">
            <div className="field">
              <label htmlFor="code">ფილიალის კოდი</label>
              <input id="code" name="code" type="text" defaultValue={b.code} required />
              <span className="hint">უნიკალური. მაგ. TBS-01</span>
            </div>
            <div className="field">
              <label htmlFor="sortOrder">რიგითობა</label>
              <input id="sortOrder" name="sortOrder" type="number" defaultValue={b.sortOrder} />
            </div>
          </div>

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
              <label htmlFor="address_en">მისამართი (EN)</label>
              <input id="address_en" name="address_en" type="text" defaultValue={address.en} />
            </div>
            <div className="field">
              <label htmlFor="address_ka">მისამართი (KA)</label>
              <input id="address_ka" name="address_ka" type="text" defaultValue={address.ka} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="hours">სამუშაო საათები (EN)</label>
              <input id="hours" name="hours" type="text" defaultValue={hours.en} />
            </div>
            <div className="field">
              <label htmlFor="hours_ka">სამუშაო საათები (KA)</label>
              <input id="hours_ka" name="hours_ka" type="text" defaultValue={hours.ka} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="phone">ტელეფონი</label>
              <input id="phone" name="phone" type="text" defaultValue={b.phone ?? ""} />
            </div>
            <div className="field" style={{ alignContent: "end" }}>
              <div className="field-check">
                <input id="active" name="active" type="checkbox" defaultChecked={b.active} />
                <label htmlFor="active">ღიაა (იღებს შეკვეთებს)</label>
              </div>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="lat">გრძედი (lat)</label>
              <input id="lat" name="lat" type="number" step="0.0000001" defaultValue={b.lat ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="lng">განედი (lng)</label>
              <input id="lng" name="lng" type="number" step="0.0000001" defaultValue={b.lng ?? ""} />
            </div>
          </div>
        </div>

        <div className="admin-panel">
          <h2>POS ტერმინალები</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>POS ID</th>
                <th>ლეიბლი (EN)</th>
                <th>ლეიბლი (KA)</th>
                <th style={{ width: 80 }}>აქტიური</th>
                <th style={{ width: 80 }}>ბარათი</th>
                <th style={{ width: 70 }}>წაშლა</th>
              </tr>
            </thead>
            <tbody>
              {b.terminals.map((t) => {
                const l = i18nOf(t.label);
                return (
                  <tr key={t.id}>
                    <td>
                      <code>{t.posId}</code>
                      <input type="hidden" name={`term_${t.id}_present`} value="1" />
                    </td>
                    <td>
                      <input name={`term_${t.id}_label_en`} type="text" defaultValue={l.en} style={inp} />
                    </td>
                    <td>
                      <input name={`term_${t.id}_label_ka`} type="text" defaultValue={l.ka} style={inp} />
                    </td>
                    <td>
                      <input type="checkbox" name={`term_${t.id}_active`} defaultChecked={t.active} />
                    </td>
                    <td>
                      <input type="checkbox" name={`term_${t.id}_card`} defaultChecked={t.hasCardTerminal} />
                    </td>
                    <td>
                      <input type="checkbox" name={`term_${t.id}_del`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="hint" style={{ marginTop: 12 }}>
            POS ID ფილიალის კოდიდან იქმნება და აღარ იცვლება — ის შეკვეთებში ინახება.
            ტერმინალის „წაშლა“ მას მხოლოდ დეაქტივირებს — POS ID ისტორიისთვის რჩება.
          </p>
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შენახვა
          </button>
          <Link className="btn btn-ghost" href="/admin/branches">
            გაუქმება
          </Link>
        </div>
      </form>

      <form action={addPos} style={{ marginTop: 16 }}>
        <button className="btn btn-ghost" type="submit">
          + POS ტერმინალის დამატება
        </button>
      </form>

      <div className="admin-panel" style={{ maxWidth: 900, marginTop: 20 }}>
        <h2>არქივი</h2>
        <p className="hint" style={{ marginBottom: 12 }}>
          დროებით დახურვისთვის (რემონტი, დასვენება) გამოიყენე <b>„ღიაა“</b> გადამრთველი.
          არქივი — როცა ფილიალი აღარ მუშაობს.
        </p>
        <ArchiveButton action={archive} subject={name.ka || name.en} consequences={consequences} />
      </div>
    </>
  );
}
