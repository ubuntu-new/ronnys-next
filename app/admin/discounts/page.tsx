import Link from "next/link";
import { db } from "@/lib/db";
import { i18nText, num } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  student: "სტუდენტი",
  diplomatic: "დიპლომატიური",
  employee: "თანამშრომელი",
  loyalty: "ლოიალობა",
  promo: "პრომო",
  custom: "სხვა",
};

export default async function DiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; archived?: string }>;
}) {
  const sp = await searchParams;

  const discounts = await db.discount.findMany({
    where: { deletedAt: null },
    orderBy: [{ type: "asc" }],
    include: { _count: { select: { rules: true, users: true } } },
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>ფასდაკლებები</h1>
          <p>{discounts.length} ჩანაწერი</p>
        </div>
        <Link className="btn" href="/admin/discounts/new">
          + ახალი ფასდაკლება
        </Link>
      </div>

      {sp.saved && <div className="alert alert-ok">შენახულია.</div>}
      {sp.archived && <div className="alert alert-ok">არქივში გადავიდა. დაბრუნება — „არქივი“ გვერდიდან.</div>}

      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>დასახელება</th>
              <th>ტიპი</th>
              <th>ნაგულისხმევი</th>
              <th>წესები</th>
              <th>მიბმული</th>
              <th>სტატუსი</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/admin/discounts/${d.id}`}>{i18nText(d.name)}</Link>
                  {d.requiresVerification && <div className="hint">ვერიფიკაცია სავალდებულოა</div>}
                </td>
                <td>{TYPE_LABEL[d.type] ?? d.type}</td>
                <td>
                  −{num(d.defaultValue)}
                  {d.defaultMode === "percent" ? "%" : "₾"}
                </td>
                <td>{d._count.rules}</td>
                <td>{d._count.users}</td>
                <td>
                  <span className={d.active ? "badge badge-on" : "badge badge-off"}>
                    {d.active ? "აქტიური" : "გამორთული"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-panel">
        <h2>როგორ ითვლება</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: "var(--a-muted)" }}>
          <li>თითოეულ პოზიციაზე იძებნება ყველაზე კონკრეტული წესი: <b>პროდუქტი → ქვე-კატეგორია → კატეგორია → ნაგულისხმევი</b>.</li>
          <li>კომბოზე და აქციურ პროდუქტზე არ ვრცელდება — ეს „პარამეტრებში“ იმართება.</li>
          <li>პროდუქტს, რომელსაც „ფასდაკლება ვრცელდება“ მოხსნილი აქვს, არცერთი ფასდაკლება არ ეხება.</li>
        </ul>
      </div>
    </>
  );
}
