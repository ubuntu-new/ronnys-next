import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export const STATUS: Record<string, string> = {
  draft: "მონახაზი",
  requested: "მოთხოვნილი",
  approved: "დამტკიცებული",
  sent: "გზაშია",
  received: "მიღებული",
  cancelled: "გაუქმებული",
};

const TONE: Record<string, React.CSSProperties> = {
  requested: { background: "#fdf3d6", color: "#8a6a12" },
  approved: { background: "#e6eefc", color: "#1f4b99" },
  sent: { background: "#fdf3d6", color: "#8a6a12" },
  received: { background: "#e8f2e8", color: "#3f7d3f" },
  cancelled: { background: "#fdecea", color: "#b3261e" },
};

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;

  const [transfers, counts] = await Promise.all([
    db.transfer.findMany({
      where: sp.status ? { status: sp.status as never } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        from: true,
        to: true,
        _count: { select: { lines: true } },
      },
    }),
    db.transfer.groupBy({ by: ["status"], _count: true }),
  ]);

  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>გადატანები</h1>
          <p>
            {transfers.length} ნაჩვენები · დასამტკიცებელი {countOf("requested")} · გზაში{" "}
            {countOf("sent")}
          </p>
        </div>
        <Link className="btn" href="/admin/stock/replenish">
          შევსების წინადადებები
        </Link>
      </div>

      <div className="admin-panel">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className={sp.status ? "btn btn-ghost" : "btn"} href="/admin/stock/transfers">
            ყველა
          </Link>
          {Object.keys(STATUS).map((s) => (
            <Link
              key={s}
              className={sp.status === s ? "btn" : "btn btn-ghost"}
              href={`/admin/stock/transfers?status=${s}`}
            >
              {STATUS[s]} {countOf(s) > 0 && `(${countOf(s)})`}
            </Link>
          ))}
          <Link className="btn btn-ghost" href="/admin/stock/transfers/new">
            + ახალი გადატანა
          </Link>
        </div>
      </div>

      <div className="admin-panel">
        {transfers.length === 0 ? (
          <p className="hint" style={{ margin: 0 }}>
            გადატანა ჯერ არ არის. დაიწყე „შევსების წინადადებებიდან“ — სისტემა თვითონ
            გეტყვის, რომელ ფილიალს რა აკლია.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>№</th>
                <th>საიდან</th>
                <th>სად</th>
                <th style={{ width: 90 }}>პოზიცია</th>
                <th style={{ width: 130 }}>სტატუსი</th>
                <th style={{ width: 150 }}>შეიქმნა</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/admin/stock/transfers/${t.id}`}>
                      <b>#{t.no}</b>
                    </Link>
                  </td>
                  <td>{i18nText(t.from.name)}</td>
                  <td>{i18nText(t.to.name)}</td>
                  <td>{t._count.lines}</td>
                  <td>
                    <span
                      className="badge"
                      style={TONE[t.status] ?? { background: "#f5f5f4", color: "#78716c" }}
                    >
                      {STATUS[t.status] ?? t.status}
                    </span>
                  </td>
                  <td>
                    <span className="hint">{new Date(t.createdAt).toLocaleString("ka-GE")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-panel">
        <h2>როგორ მუშაობს</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: "var(--a-muted)" }}>
          <li>
            <b>მოთხოვნა → დამტკიცება → გაგზავნა → მიღება.</b> თითო ეტაპს თავისი
            პასუხისმგებელი ჰყავს და ჟურნალში იწერება.
          </li>
          <li>
            მარაგი მხოლოდ ორ წერტილში იცვლება: <b>გაგზავნისას</b> აკლდება წყაროს,
            <b> მიღებისას</b> ემატება ფილიალს. შუალედური ეტაპები შეთანხმებაა, არა მოძრაობა.
          </li>
          <li>
            გაგზავნილი და მიღებული ცალკე იწერება — <b>სხვაობა თვალსაჩინოა</b> და არ იკარგება.
          </li>
        </ul>
      </div>
    </>
  );
}
