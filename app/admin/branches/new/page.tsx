import Link from "next/link";
import { createBranch } from "../actions";

export const dynamic = "force-dynamic";

export default function NewBranch() {
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ახალი ფილიალი</h1>
          <p>POS ტერმინალები კოდის მიხედვით ავტომატურად შეიქმნება</p>
        </div>
        <Link className="btn btn-ghost" href="/admin/branches">
          ← სია
        </Link>
      </div>

      <form className="admin-panel admin-form" action={createBranch}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="code">ფილიალის კოდი</label>
            <input id="code" name="code" type="text" placeholder="TBS-06" required autoFocus />
            <span className="hint">უნიკალური. POS ID ამისგან იქმნება.</span>
          </div>
          <div className="field">
            <label htmlFor="posCount">POS ტერმინალი</label>
            <input id="posCount" name="posCount" type="number" min="1" max="10" defaultValue="2" />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="name_en">დასახელება (EN)</label>
            <input id="name_en" name="name_en" type="text" required />
          </div>
          <div className="field">
            <label htmlFor="name_ka">დასახელება (KA)</label>
            <input id="name_ka" name="name_ka" type="text" />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="address_en">მისამართი (EN)</label>
            <input id="address_en" name="address_en" type="text" />
          </div>
          <div className="field">
            <label htmlFor="address_ka">მისამართი (KA)</label>
            <input id="address_ka" name="address_ka" type="text" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="phone">ტელეფონი</label>
          <input id="phone" name="phone" type="text" />
        </div>

        <div className="alert" style={{ background: "#fdf3d6", color: "#8a6a12" }}>
          ახალი ფილიალი <b>დახურულია</b> — შეკვეთებს არ იღებს სანამ არ ჩართავ.
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შექმნა და რედაქტირება
          </button>
          <Link className="btn btn-ghost" href="/admin/branches">
            გაუქმება
          </Link>
        </div>
      </form>
    </>
  );
}
