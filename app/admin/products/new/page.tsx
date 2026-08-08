import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { createProduct } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewProduct() {
  const categories = await db.category.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ახალი პროდუქტი</h1>
          <p>შექმნის შემდეგ დანარჩენ ველებს შეავსებ</p>
        </div>
        <Link className="btn btn-ghost" href="/admin/products">
          ← სია
        </Link>
      </div>

      <form className="admin-panel admin-form" action={createProduct}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="name_en">დასახელება (EN)</label>
            <input id="name_en" name="name_en" type="text" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="name_ka">დასახელება (KA)</label>
            <input id="name_ka" name="name_ka" type="text" />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="categoryId">კატეგორია</label>
            <select id="categoryId" name="categoryId" required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {i18nText(c.name)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="type">ტიპი</label>
            <select id="type" name="type" defaultValue="item">
              <option value="pizza">პიცა (3 ზომა ავტომატურად)</option>
              <option value="item">ჩვეულებრივი</option>
              <option value="sticks">ჯოხები / კონსტრუქტორი</option>
              <option value="drink">სასმელი</option>
              <option value="merch">მერჩი</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="price">ფასი (₾)</label>
          <input id="price" name="price" type="number" step="0.01" min="0" defaultValue="0" />
          <span className="hint">პიცაზე იგნორირდება — ზომების ფასს რედაქტირებაზე შეავსებ.</span>
        </div>

        <div className="alert" style={{ background: "#fdf3d6", color: "#8a6a12" }}>
          ახალი პროდუქტი <b>გამორთული</b> იქმნება. მენიუში გამოსაჩენად ჩართე რედაქტირების გვერდზე.
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შექმნა და რედაქტირება
          </button>
          <Link className="btn btn-ghost" href="/admin/products">
            გაუქმება
          </Link>
        </div>
      </form>
    </>
  );
}
