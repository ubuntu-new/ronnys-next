import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { createEmployee } from "../actions";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 14 };

export default async function NewEmployee() {
  const branches = await db.branch.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ახალი თანამშრომელი</h1>
          <p>PIN-ს შექმნის შემდეგ დააყენებ</p>
        </div>
        <Link className="btn btn-ghost" href="/admin/employees">
          ← სია
        </Link>
      </div>

      <form className="admin-form" action={createEmployee} style={{ maxWidth: 880 }}>
        <div className="admin-panel">
          <h2>ძირითადი</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="name">სახელი</label>
              <input id="name" name="name" type="text" required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="title">თანამდებობა</label>
              <input id="title" name="title" type="text" />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="phone">ტელეფონი</label>
              <input id="phone" name="phone" type="text" />
            </div>
            <div className="field">
              <label htmlFor="role">როლი</label>
              <select id="role" name="role" defaultValue="cashier">
                <option value="branch_manager">ფილიალის მენეჯერი</option>
                <option value="cashier">მოლარე</option>
                <option value="kitchen">სამზარეულო</option>
                <option value="driver">კურიერი</option>
                <option value="super_admin">სუპერ ადმინი</option>
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="email">ელფოსტა</label>
              <input id="email" name="email" type="text" />
              <span className="hint">მხოლოდ მაშინ, თუ ადმინ-პანელში უნდა შედიოდეს.</span>
            </div>
            <div className="field">
              <label htmlFor="password">პაროლი</label>
              <input id="password" name="password" type="text" placeholder="მინიმუმ 10 სიმბოლო" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="hourlyRate">საათობრივი განაკვეთი (₾)</label>
            <input id="hourlyRate" name="hourlyRate" type="number" step="0.01" min="0" />
          </div>
        </div>

        <div className="admin-panel">
          <h2>უფლებები</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
            {PERMISSIONS.map((p) => (
              <label key={p.id} style={cell}>
                <input type="checkbox" name="perm" value={p.id} />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="admin-panel">
          <h2>ფილიალები</h2>
          <div className="field">
            <label htmlFor="homeBranchId">ძირითადი ფილიალი</label>
            <select id="homeBranchId" name="homeBranchId" defaultValue="">
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {i18nText(b.name)} · {b.code}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>სად შეუძლია მუშაობა</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              {branches.map((b) => (
                <label key={b.id} style={cell}>
                  <input type="checkbox" name="branch" value={b.id} />
                  <span>
                    {i18nText(b.name)} <span className="hint">· {b.code}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შექმნა
          </button>
          <Link className="btn btn-ghost" href="/admin/employees">
            გაუქმება
          </Link>
        </div>
      </form>
    </>
  );
}
