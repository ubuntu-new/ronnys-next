import Link from "next/link";
import { createDiscount } from "../actions";

export const dynamic = "force-dynamic";

export default function NewDiscount() {
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ახალი ფასდაკლება</h1>
          <p>წესებს შექმნის შემდეგ დაამატებ</p>
        </div>
        <Link className="btn btn-ghost" href="/admin/discounts">
          ← სია
        </Link>
      </div>

      <form className="admin-panel admin-form" action={createDiscount}>
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

        <div className="field">
          <label htmlFor="type">ტიპი</label>
          <select id="type" name="type" defaultValue="custom">
            <option value="student">სტუდენტი</option>
            <option value="diplomatic">დიპლომატიური</option>
            <option value="employee">თანამშრომელი</option>
            <option value="loyalty">ლოიალობა</option>
            <option value="promo">პრომო</option>
            <option value="custom">სხვა</option>
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="defaultMode">ნაგულისხმევი ტიპი</label>
            <select id="defaultMode" name="defaultMode" defaultValue="percent">
              <option value="percent">პროცენტი (%)</option>
              <option value="fixed">ფიქსირებული (₾)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="defaultValue">ნაგულისხმევი ოდენობა</label>
            <input id="defaultValue" name="defaultValue" type="number" step="0.01" min="0" defaultValue="0" />
          </div>
        </div>

        <div className="field-check">
          <input id="requiresVerification" name="requiresVerification" type="checkbox" />
          <label htmlFor="requiresVerification">ვერიფიკაცია სავალდებულოა (სტუდენტი, დიპლომატი)</label>
        </div>

        <div className="alert" style={{ background: "#fdf3d6", color: "#8a6a12" }}>
          ახალი ფასდაკლება <b>გამორთული</b> იქმნება.
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შექმნა და რედაქტირება
          </button>
          <Link className="btn btn-ghost" href="/admin/discounts">
            გაუქმება
          </Link>
        </div>
      </form>
    </>
  );
}
