import Link from "next/link";
import { createStockItem } from "../../actions";

export const dynamic = "force-dynamic";

export default function NewStockItem() {
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ახალი საწყობის ერთეული</h1>
          <p>მინიმუმებს შექმნის შემდეგ დააყენებ</p>
        </div>
        <Link className="btn btn-ghost" href="/admin/stock/items">
          ← სია
        </Link>
      </div>

      <form className="admin-panel admin-form" action={createStockItem}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="name_en">დასახელება (EN)</label>
            <input id="name_en" name="name_en" type="text" required autoFocus placeholder="Mozzarella" />
          </div>
          <div className="field">
            <label htmlFor="name_ka">დასახელება (KA)</label>
            <input id="name_ka" name="name_ka" type="text" placeholder="მოცარელა" />
          </div>
        </div>

        <div className="field-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="field">
            <label htmlFor="unit">ერთეული</label>
            <select id="unit" name="unit" defaultValue="kg">
              <option value="kg">კილოგრამი</option>
              <option value="g">გრამი</option>
              <option value="l">ლიტრი</option>
              <option value="ml">მილილიტრი</option>
              <option value="pcs">ცალი</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="category">ჯგუფი</label>
            <input id="category" name="category" type="text" placeholder="dairy / meat / veg" />
          </div>
          <div className="field">
            <label htmlFor="sku">SKU</label>
            <input id="sku" name="sku" type="text" placeholder="არასავალდებულო" />
          </div>
        </div>

        <div className="field-check">
          <input id="isProduced" name="isProduced" type="checkbox" />
          <label htmlFor="isProduced">საწარმოში მზადდება რეცეპტით (ცომი, სოუსი)</label>
        </div>

        <div className="field">
          <label htmlFor="note">შენიშვნა</label>
          <input id="note" name="note" type="text" />
        </div>

        <p className="hint">
          <b>ერთეულის არჩევა მნიშვნელოვანია</b> — რეცეპტები იმავე ერთეულში ჩაიწერება.
          თუ მოცარელას კილოგრამებში ინახავ, რეცეპტშიც კილოგრამი იქნება (0.18 კგ).
        </p>

        <div className="form-actions">
          <button className="btn" type="submit">
            შექმნა
          </button>
          <Link className="btn btn-ghost" href="/admin/stock/items">
            გაუქმება
          </Link>
        </div>
      </form>
    </>
  );
}
