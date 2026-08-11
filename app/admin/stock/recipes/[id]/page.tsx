import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { i18nOf, i18nText } from "@/lib/admin-utils";
import { fmtQty } from "@/lib/stock";
import { updateRecipe, archiveRecipe } from "../actions";
import ArchiveButton from "../../../_components/ArchiveButton";

export const dynamic = "force-dynamic";

const inp: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--a-line)",
  borderRadius: 6,
  font: "inherit",
};

export default async function RecipeEdit({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [recipe, items] = await Promise.all([
    db.recipe.findUnique({
      where: { id },
      include: {
        outputItem: true,
        lines: { include: { item: true } },
        _count: { select: { orders: true } },
      },
    }),
    db.stockItem.findMany({ where: { deletedAt: null, active: true }, orderBy: { category: "asc" } }),
  ]);
  if (!recipe) notFound();

  const name = i18nOf(recipe.name);
  const used = new Set(recipe.lines.map((l) => l.itemId));

  const save = updateRecipe.bind(null, id);
  const archive = archiveRecipe.bind(null, id);

  const consequences = [
    "ახალი პარტიის დაწყებისას ვეღარ აირჩევ.",
    `${recipe._count.orders} დასრულებული პარტია ხელუხლებელი რჩება — მათში ნედლეულის ასლია შენახული.`,
    "მარაგი არ იცვლება.",
  ];

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{name.ka || name.en}</h1>
          <p>
            {fmtQty(Number(recipe.outputQty), recipe.outputItem.unit)}{" "}
            {i18nText(recipe.outputItem.name)} · {recipe._count.orders} პარტია
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/stock/recipes">
          ← სია
        </Link>
      </div>

      {sp.saved && <div className="alert alert-ok">შენახულია.</div>}

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
              <label htmlFor="outputItemId">რას აწარმოებს</label>
              <select id="outputItemId" name="outputItemId" defaultValue={recipe.outputItemId}>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {i18nText(it.name)} ({it.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="outputQty">ერთი გატარების გამოსავალი</label>
              <input
                id="outputQty"
                name="outputQty"
                type="number"
                step="0.001"
                min="0"
                defaultValue={Number(recipe.outputQty)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="note">შენიშვნა</label>
            <input id="note" name="note" type="text" defaultValue={recipe.note ?? ""} />
          </div>

          <div className="field-check">
            <input id="active" name="active" type="checkbox" defaultChecked={recipe.active} />
            <label htmlFor="active">აქტიური</label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>შემავალი ნედლეული</h2>
          <p className="hint" style={{ marginTop: -8, marginBottom: 14 }}>
            რაოდენობა <b>ერთ გატარებაზეა</b>. პარტიაში ის გამრავლდება გატარებების რიცხვზე.
          </p>

          {recipe.lines.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ერთეული</th>
                  <th style={{ width: 160 }}>რაოდენობა</th>
                  <th style={{ width: 70 }}>წაშლა</th>
                </tr>
              </thead>
              <tbody>
                {recipe.lines.map((l) => (
                  <tr key={l.id}>
                    <td>{i18nText(l.item.name)}</td>
                    <td>
                      <input
                        name={`qty_${l.id}`}
                        type="number"
                        step="0.001"
                        min="0"
                        defaultValue={Number(l.qty)}
                        style={inp}
                      />
                      <span className="hint">{l.item.unit}</span>
                    </td>
                    <td>
                      <input type="checkbox" name={`del_${l.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="field" style={{ marginTop: 14 }}>
            <label>შემავალის დამატება</label>
            <div className="field-row">
              <select name="new_itemId" defaultValue="">
                <option value="">— აირჩიე —</option>
                {items
                  .filter((it) => !used.has(it.id) && it.id !== recipe.outputItemId)
                  .map((it) => (
                    <option key={it.id} value={it.id}>
                      {i18nText(it.name)} ({it.unit})
                    </option>
                  ))}
              </select>
              <input name="new_qty" type="number" step="0.001" min="0" placeholder="რაოდენობა" />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შენახვა
          </button>
          <Link className="btn btn-ghost" href="/admin/stock/recipes">
            გაუქმება
          </Link>
        </div>
      </form>

      <div className="admin-panel" style={{ maxWidth: 900, marginTop: 20 }}>
        <h2>არქივი</h2>
        <ArchiveButton action={archive} subject={name.ka || name.en} consequences={consequences} />
      </div>
    </>
  );
}
