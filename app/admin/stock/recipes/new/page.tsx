import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { createRecipe } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewRecipe() {
  const items = await db.stockItem.findMany({
    where: { deletedAt: null, active: true },
    orderBy: { category: "asc" },
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ახალი რეცეპტი</h1>
          <p>შემავალებს შექმნის შემდეგ დაამატებ</p>
        </div>
        <Link className="btn btn-ghost" href="/admin/stock/recipes">
          ← სია
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="admin-panel">
          <p className="hint" style={{ margin: 0 }}>
            საწყობის ერთეული ჯერ არ არის.{" "}
            <Link href="/admin/stock/items/new">დაამატე ჯერ ისინი →</Link>
          </p>
        </div>
      ) : (
        <form className="admin-panel admin-form" action={createRecipe}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="name_en">დასახელება (EN)</label>
              <input id="name_en" name="name_en" type="text" required autoFocus placeholder="Dough batch" />
            </div>
            <div className="field">
              <label htmlFor="name_ka">დასახელება (KA)</label>
              <input id="name_ka" name="name_ka" type="text" placeholder="ცომის პარტია" />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="outputItemId">რას აწარმოებს</label>
              <select id="outputItemId" name="outputItemId" required>
                <option value="">— აირჩიე —</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {i18nText(it.name)} ({it.unit})
                    {it.isProduced ? " · იწარმოება" : ""}
                  </option>
                ))}
              </select>
              <span className="hint">
                ერთეულს სასურველია „საწარმოში მზადდება“ მონიშნული ჰქონდეს.
              </span>
            </div>
            <div className="field">
              <label htmlFor="outputQty">ერთი გატარების გამოსავალი</label>
              <input id="outputQty" name="outputQty" type="number" step="0.001" min="0" required placeholder="100" />
              <span className="hint">პარტიაში ეს გამრავლდება გატარებების რაოდენობაზე.</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="note">შენიშვნა</label>
            <input id="note" name="note" type="text" placeholder="მომზადების წესი, ტემპერატურა…" />
          </div>

          <div className="form-actions">
            <button className="btn" type="submit">
              შექმნა
            </button>
            <Link className="btn btn-ghost" href="/admin/stock/recipes">
              გაუქმება
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
