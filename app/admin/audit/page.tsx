import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

/** მოქმედების პრეფიქსი → ქართული ჯგუფი */
const GROUP: Record<string, string> = {
  product: "პროდუქტები",
  topping: "ტოპინგები",
  toppings: "ტოპინგები",
  combo: "კომბოები",
  category: "კატეგორიები",
  categories: "კატეგორიები",
  branch: "ფილიალები",
  employee: "თანამშრომლები",
  discount: "ფასდაკლებები",
  setting: "პარამეტრები",
  order: "შეკვეთები",
  availability: "ხელმისაწვდომობა",
  stockItem: "საწყობის ერთეულები",
  consumption: "ხარჯვის წესები",
  transfer: "გადატანები",
};

const VERB: Record<string, string> = {
  create: "შექმნა",
  update: "შეცვლა",
  archive: "არქივში",
  restore: "დაბრუნება",
  delete: "წაშლა",
  bulkUpdate: "ჯგუფური შეცვლა",
  upsert: "ჩაწერა",
  setPassword: "პაროლის შეცვლა",
  setPin: "PIN-ის შეცვლა",
  new: "ახალი",
  confirmed: "დადასტურება",
  preparing: "მზადება",
  ready: "მზადაა",
  delivering: "მიტანა",
  completed: "დასრულება",
  cancelled: "გაუქმება",
};

function label(action: string) {
  const [head, tail] = action.split(".");
  const group = GROUP[head] ?? head;
  const verb = tail ? (VERB[tail] ?? tail) : "";
  return { group, verb };
}

/** ჟურნალი კითხვადი უნდა იყოს — ერთ ხაზზე მოკლედ. */
function shortJson(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  try {
    const s = JSON.stringify(v);
    if (!s || s === "{}" || s === "null") return null;
    return s.length > 160 ? s.slice(0, 160) + "…" : s;
  } catch {
    return null;
  }
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; who?: string; days?: string }>;
}) {
  const sp = await searchParams;

  const days = Math.min(90, Math.max(1, Number(sp.days) || 7));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [employees, logs, groups] = await Promise.all([
    db.employee.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.auditLog.findMany({
      where: {
        at: { gte: since },
        ...(sp.who ? { employeeId: sp.who } : {}),
        ...(sp.group ? { action: { startsWith: `${sp.group}.` } } : {}),
      },
      orderBy: { at: "desc" },
      take: 300,
      include: { employee: { select: { id: true, name: true } } },
    }),
    db.auditLog.groupBy({
      by: ["entityType"],
      where: { at: { gte: since } },
      _count: true,
    }),
  ]);

  // action-ის პრეფიქსები ფილტრისთვის
  const prefixes = Array.from(
    new Set(logs.map((l) => l.action.split(".")[0])),
  ).sort();

  const totalInPeriod = groups.reduce((s, g) => s + g._count, 0);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ჟურნალი</h1>
          <p>
            ბოლო {days} დღე · {logs.length} ნაჩვენები
            {totalInPeriod > logs.length && ` (სულ ${totalInPeriod})`}
          </p>
        </div>
      </div>

      <div className="admin-panel">
        <h2>პერიოდი</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {[1, 7, 30, 90].map((d) => (
            <Link
              key={d}
              className={days === d ? "btn" : "btn btn-ghost"}
              href={`/admin/audit?days=${d}${sp.group ? `&group=${sp.group}` : ""}${sp.who ? `&who=${sp.who}` : ""}`}
            >
              {d === 1 ? "დღეს" : `${d} დღე`}
            </Link>
          ))}
        </div>

        <h2>რაზე</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <Link
            className={sp.group ? "btn btn-ghost" : "btn"}
            href={`/admin/audit?days=${days}${sp.who ? `&who=${sp.who}` : ""}`}
          >
            ყველა
          </Link>
          {prefixes.map((p) => (
            <Link
              key={p}
              className={sp.group === p ? "btn" : "btn btn-ghost"}
              href={`/admin/audit?days=${days}&group=${p}${sp.who ? `&who=${sp.who}` : ""}`}
            >
              {GROUP[p] ?? p}
            </Link>
          ))}
        </div>

        <h2>ვინ</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link
            className={sp.who ? "btn btn-ghost" : "btn"}
            href={`/admin/audit?days=${days}${sp.group ? `&group=${sp.group}` : ""}`}
          >
            ყველა
          </Link>
          {employees.map((e) => (
            <Link
              key={e.id}
              className={sp.who === e.id ? "btn" : "btn btn-ghost"}
              href={`/admin/audit?days=${days}&who=${e.id}${sp.group ? `&group=${sp.group}` : ""}`}
            >
              {e.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="admin-panel">
        {logs.length === 0 ? (
          <p className="hint" style={{ margin: 0 }}>
            ამ პერიოდში ჩანაწერი არ არის.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 150 }}>დრო</th>
                <th style={{ width: 160 }}>ვინ</th>
                <th style={{ width: 140 }}>რაზე</th>
                <th style={{ width: 130 }}>მოქმედება</th>
                <th>დეტალები</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const { group, verb } = label(l.action);
                const before = shortJson(l.before);
                const after = shortJson(l.after);

                return (
                  <tr key={l.id}>
                    <td>
                      <span className="hint">{new Date(l.at).toLocaleString("ka-GE")}</span>
                    </td>
                    <td>{l.employee?.name ?? <span className="hint">სისტემა</span>}</td>
                    <td>{group}</td>
                    <td>
                      <span className="hint">{verb || l.action}</span>
                    </td>
                    <td>
                      <span className="hint">{l.entityId ?? ""}</span>
                      {before && (
                        <div className="hint" style={{ color: "var(--a-danger)" }}>
                          − {before}
                        </div>
                      )}
                      {after && (
                        <div className="hint" style={{ color: "var(--a-ok)" }}>
                          + {after}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-panel">
        <h2>რას ნიშნავს</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: "var(--a-muted)" }}>
          <li>ჩანაწერი <b>მხოლოდ ემატება</b> — არასდროს იშლება და არ იცვლება.</li>
          <li>
            <span style={{ color: "var(--a-danger)" }}>−</span> ძველი მნიშვნელობა,{" "}
            <span style={{ color: "var(--a-ok)" }}>+</span> ახალი. მხოლოდ შეცვლილი ველები.
          </li>
          <li>„სისტემა" ნიშნავს, რომ მოქმედება ავტომატურია (მაგ. საიტიდან შემოსული შეკვეთა).</li>
          <li>ზემოთა საძიებო ველი ამ ცხრილშიც მუშაობს — ჩაწერე id, სახელი ან რიცხვი.</li>
        </ul>
      </div>
    </>
  );
}
