import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const sp = await searchParams;

  const branches = await db.branch.findMany({
    orderBy: { sortOrder: "asc" },
    include: { terminals: true },
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ფილიალები</h1>
          <p>
            {branches.length} ფილიალი ·{" "}
            {branches.reduce((n, b) => n + b.terminals.length, 0)} POS ტერმინალი
          </p>
        </div>
      </div>

      {sp.saved && <div className="alert alert-ok">შენახულია.</div>}

      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>კოდი</th>
              <th>დასახელება</th>
              <th>მისამართი</th>
              <th>ტელეფონი</th>
              <th>POS</th>
              <th>სტატუსი</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id}>
                <td>
                  <code>{b.code}</code>
                </td>
                <td>
                  <Link href={`/admin/branches/${b.id}`}>{i18nText(b.name)}</Link>
                </td>
                <td>
                  <span className="hint">{i18nText(b.address)}</span>
                </td>
                <td>{b.phone ?? "—"}</td>
                <td>
                  {b.terminals.filter((t) => t.active).length}/{b.terminals.length}
                </td>
                <td>
                  <span className={b.active ? "badge badge-on" : "badge badge-off"}>
                    {b.active ? "ღიაა" : "დახურული"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-panel">
        <h2>შენიშვნა</h2>
        <p className="hint">
          ფილიალის კოდი (მაგ. <code>TBS-01</code>) ყველა შეკვეთასა და ცვლაში ინახება — მისი
          შეცვლა ძველ ჩანაწერებს არ ცვლის, მაგრამ ახალ POS ID-ებზე აისახება.
        </p>
      </div>
    </>
  );
}
