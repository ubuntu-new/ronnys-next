import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "სუპერ ადმინი",
  branch_manager: "ფილიალის მენეჯერი",
  cashier: "მოლარე",
  kitchen: "სამზარეულო",
  driver: "კურიერი",
};

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; archived?: string }>;
}) {
  const sp = await searchParams;

  const employees = await db.employee.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { branches: { include: { branch: true } } },
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>თანამშრომლები</h1>
          <p>{employees.length} ჩანაწერი</p>
        </div>
        <Link className="btn" href="/admin/employees/new">
          + ახალი თანამშრომელი
        </Link>
      </div>

      {sp.saved && <div className="alert alert-ok">შენახულია.</div>}
      {sp.archived && <div className="alert alert-ok">არქივში გადავიდა. დაბრუნება — „არქივი“ გვერდიდან.</div>}

      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>სახელი</th>
              <th>როლი</th>
              <th>ფილიალები</th>
              <th>შესვლა</th>
              <th>POS PIN</th>
              <th>სტატუსი</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link href={`/admin/employees/${e.id}`}>{e.name}</Link>
                  {e.title && <div className="hint">{e.title}</div>}
                </td>
                <td>{ROLE_LABEL[e.role] ?? e.role}</td>
                <td>
                  <span className="hint">
                    {e.branches.length
                      ? e.branches.map((b) => i18nText(b.branch.name)).join(", ")
                      : "—"}
                  </span>
                </td>
                <td>
                  {e.email ? (
                    <span className="hint">{e.email}</span>
                  ) : (
                    <span className="hint">—</span>
                  )}
                </td>
                <td>
                  <span className={e.posPinHash ? "badge badge-on" : "badge badge-off"}>
                    {e.posPinHash ? "დაყენებული" : "არ აქვს"}
                  </span>
                </td>
                <td>
                  <span className={e.active ? "badge badge-on" : "badge badge-off"}>
                    {e.active ? "აქტიური" : "გამორთული"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-panel">
        <h2>როგორ მუშაობს წვდომა</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: "var(--a-muted)" }}>
          <li><b>ადმინ-პანელი</b> — ელფოსტა + პაროლი. პაროლის გარეშე შესვლა შეუძლებელია.</li>
          <li><b>POS</b> — 4–8 ციფრიანი PIN. თითოეული უნიკალურია.</li>
          <li><b>super_admin</b> ყველა უფლებას ავტომატურად ატარებს — მონიშვნა არ სჭირდება.</li>
          <li>ბოლო აქტიური super_admin-ის გამორთვა დაბლოკილია.</li>
        </ul>
      </div>
    </>
  );
}
