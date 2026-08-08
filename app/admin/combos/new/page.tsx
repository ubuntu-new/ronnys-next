import Link from "next/link";
import { createCombo } from "../actions";

export const dynamic = "force-dynamic";

export default function NewCombo() {
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ახალი კომბო</h1>
          <p>შექმნის შემდეგ სლოტებს შეავსებ</p>
        </div>
        <Link className="btn btn-ghost" href="/admin/combos">
          ← სია
        </Link>
      </div>

      <form className="admin-panel admin-form" action={createCombo}>
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
            <label htmlFor="pricingMode">ფასდადება</label>
            <select id="pricingMode" name="pricingMode" defaultValue="fixed">
              <option value="fixed">ფიქსირებული ფასი</option>
              <option value="discount">ფასდაკლება ჯამზე (%)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="slots">სლოტების რაოდენობა</label>
            <input id="slots" name="slots" type="number" min="1" max="8" defaultValue="3" />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="price">ფიქსირებული ფასი (₾)</label>
            <input id="price" name="price" type="number" step="0.01" min="0" />
          </div>
          <div className="field">
            <label htmlFor="percent">ფასდაკლება (%)</label>
            <input id="percent" name="percent" type="number" step="0.01" min="0" max="100" />
          </div>
        </div>

        <div className="alert" style={{ background: "#fdf3d6", color: "#8a6a12" }}>
          ახალი კომბო <b>გამორთული</b> იქმნება.
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შექმნა და რედაქტირება
          </button>
          <Link className="btn btn-ghost" href="/admin/combos">
            გაუქმება
          </Link>
        </div>
      </form>
    </>
  );
}
