import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { i18nText, num } from "@/lib/admin-utils";
import { getSession } from "@/lib/admin-auth";
import {
  updateEmployee,
  setPassword,
  setPin,
  clearPin,
  archiveEmployee,
  PERMISSIONS,
} from "../actions";
import ArchiveButton from "../../_components/ArchiveButton";

export const dynamic = "force-dynamic";

const ROLES = [
  { v: "super_admin", l: "სუპერ ადმინი — ყველა უფლება" },
  { v: "branch_manager", l: "ფილიალის მენეჯერი" },
  { v: "cashier", l: "მოლარე" },
  { v: "kitchen", l: "სამზარეულო" },
  { v: "driver", l: "კურიერი" },
];

const cell: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 14 };

export default async function EmployeeEdit({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pw?: string; pin?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [e, branches, session] = await Promise.all([
    db.employee.findUnique({
      where: { id },
      include: { branches: true, _count: { select: { shifts: true, orders: true } } },
    }),
    db.branch.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    getSession(),
  ]);
  if (!e) notFound();

  const myBranches = new Set(e.branches.map((b) => b.branchId));
  const perms = new Set(e.permissions);
  const isSelf = session?.sub === e.id;

  const save = updateEmployee.bind(null, id);
  const savePw = setPassword.bind(null, id);
  const savePin = setPin.bind(null, id);
  const dropPin = clearPin.bind(null, id);
  const archive = archiveEmployee.bind(null, id);

  const consequences = [
    "ადმინ-პანელსა და POS-ში შესვლას ვეღარ შეძლებს.",
    "POS PIN გაუქმდება — იმავე PIN-ის სხვისთვის მიცემა შესაძლებელი გახდება.",
    e._count.orders > 0
      ? `${e._count.orders} შეკვეთა, სადაც ის ფიგურირებს, ხელუხლებელი რჩება.`
      : "შეკვეთები არ აქვს.",
    e._count.shifts > 0
      ? `${e._count.shifts} ცვლის ჩანაწერი რჩება — ხელფასის ისტორია არ ზარალდება.`
      : "ცვლების ჩანაწერი არ აქვს.",
  ];

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{e.name}</h1>
          <p>
            {e.title ?? e.role}
            {isSelf && " · ეს შენ ხარ"}
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/employees">
          ← სია
        </Link>
      </div>

      {sp.pw && <div className="alert alert-ok">პაროლი შეიცვალა.</div>}
      {sp.pin && <div className="alert alert-ok">PIN შეიცვალა.</div>}

      <form className="admin-form" action={save} style={{ maxWidth: 880 }}>
        <div className="admin-panel">
          <h2>ძირითადი</h2>

          <div className="field-row">
            <div className="field">
              <label htmlFor="name">სახელი</label>
              <input id="name" name="name" type="text" defaultValue={e.name} required />
            </div>
            <div className="field">
              <label htmlFor="title">თანამდებობა</label>
              <input id="title" name="title" type="text" defaultValue={e.title ?? ""} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="email">ელფოსტა (ადმინში შესასვლელად)</label>
              <input id="email" name="email" type="text" defaultValue={e.email ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="phone">ტელეფონი</label>
              <input id="phone" name="phone" type="text" defaultValue={e.phone ?? ""} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="role">როლი</label>
              <select id="role" name="role" defaultValue={e.role}>
                {ROLES.map((r) => (
                  <option key={r.v} value={r.v}>
                    {r.l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="hourlyRate">საათობრივი განაკვეთი (₾)</label>
              <input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                defaultValue={e.hourlyRate ? num(e.hourlyRate) : ""}
              />
            </div>
          </div>
        </div>

        <div className="admin-panel">
          <h2>უფლებები</h2>
          <p className="hint" style={{ marginTop: -8, marginBottom: 12 }}>
            <b>super_admin</b>-ს ეს მონიშვნები არ სჭირდება — მას ყველა უფლება ავტომატურად აქვს.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
            {PERMISSIONS.map((p) => (
              <label key={p.id} style={cell}>
                <input type="checkbox" name="perm" value={p.id} defaultChecked={perms.has(p.id)} />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="admin-panel">
          <h2>ფილიალები</h2>
          <input type="hidden" name="branches_present" value="1" />
          <div className="field">
            <label htmlFor="homeBranchId">ძირითადი ფილიალი</label>
            <select id="homeBranchId" name="homeBranchId" defaultValue={e.homeBranchId ?? ""}>
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
                  <input type="checkbox" name="branch" value={b.id} defaultChecked={myBranches.has(b.id)} />
                  <span>
                    {i18nText(b.name)} <span className="hint">· {b.code}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-panel">
          <h2>სტატუსი</h2>
          <div className="field-check">
            <input id="active" name="active" type="checkbox" defaultChecked={e.active} />
            <label htmlFor="active">აქტიური (შეუძლია შესვლა)</label>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            {e._count.shifts} ცვლა · {e._count.orders} შეკვეთა
          </p>
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            შენახვა
          </button>
          <Link className="btn btn-ghost" href="/admin/employees">
            გაუქმება
          </Link>
        </div>
      </form>

      {/* ── პაროლი ── */}
      <form className="admin-panel admin-form" action={savePw} style={{ maxWidth: 880, marginTop: 20 }}>
        <h2>ადმინ-პანელის პაროლი</h2>
        <p className="hint" style={{ marginTop: -8 }}>
          {e.passwordHash ? "დაყენებულია. ახლის შეყვანა ჩაანაცვლებს." : "ჯერ არ არის დაყენებული — შესვლა შეუძლებელია."}
        </p>
        <div className="field">
          <label htmlFor="newPassword">ახალი პაროლი</label>
          <input id="newPassword" name="newPassword" type="text" placeholder="მინიმუმ 10 სიმბოლო" />
          <span className="hint">ჩაწერე და გადაეცი თანამშრომელს — შენახვის შემდეგ ვეღარ ნახავ.</span>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" type="submit">
            პაროლის დაყენება
          </button>
        </div>
      </form>

      {/* ── POS PIN ── */}
      <form className="admin-panel admin-form" action={savePin} style={{ maxWidth: 880 }}>
        <h2>POS PIN</h2>
        <p className="hint" style={{ marginTop: -8 }}>
          {e.posPinHash ? "დაყენებულია." : "ჯერ არ არის — POS-ში შესვლა შეუძლებელია."}
        </p>
        <div className="field">
          <label htmlFor="newPin">ახალი PIN</label>
          <input id="newPin" name="newPin" type="text" inputMode="numeric" placeholder="4–8 ციფრი" />
          <span className="hint">უნიკალური უნდა იყოს — გამეორებაზე შეცდომას მოგცემს.</span>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" type="submit">
            PIN-ის დაყენება
          </button>
        </div>
      </form>

      {e.posPinHash && (
        <form action={dropPin} style={{ maxWidth: 880, marginTop: -8 }}>
          <button className="btn btn-ghost" type="submit">
            PIN-ის მოხსნა
          </button>
        </form>
      )}

      {/* ── არქივი ── */}
      {!isSelf && (
        <div className="admin-panel" style={{ maxWidth: 880, marginTop: 20 }}>
          <h2>არქივი</h2>
          <p className="hint" style={{ marginBottom: 12 }}>
            დროებით შვებულებისთვის ჯობია <b>„აქტიური“</b> გადამრთველი. არქივი — როცა თანამშრომელი წავიდა.
          </p>
          <ArchiveButton action={archive} subject={e.name} consequences={consequences} />
        </div>
      )}
    </>
  );
}
