import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { i18nText, money } from "@/lib/admin-utils";
import { setOrderStatus } from "../actions";
import { detailLines, lineColor } from "@/lib/item-detail";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  new: "ახალი",
  confirmed: "დადასტურებული",
  preparing: "მზადდება",
  ready: "მზადაა",
  delivering: "მიაქვთ",
  completed: "დასრულებული",
  cancelled: "გაუქმებული",
};

/** რა შეიძლება მოხდეს მიმდინარე სტატუსიდან. */
const NEXT: Record<string, string[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivering", "completed", "cancelled"],
  delivering: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const KIND: Record<string, string> = {
  pizza: "პიცა",
  half_and_half: "ნახევარ-ნახევარი",
  combo: "კომბო",
  sticks: "ჯოხები",
  product: "პროდუქტი",
};

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const o = await db.order.findUnique({
    where: { id },
    include: { branch: true, items: true },
  });
  if (!o) notFound();

  // ძველი შეკვეთები ინგრედიენტების ასლის გარეშე შეიქმნა — მათთვის
  // პროდუქტის მიმდინარე რეცეპტს ვიყენებთ, რომ სია მაინც ჩანდეს
  const productIds = o.items.map((i) => i.productId).filter((x): x is string => !!x);
  const recipes = productIds.length
    ? await db.productTopping.findMany({
        where: { productId: { in: productIds } },
        include: { topping: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      })
    : [];
  const recipeOf = (pid: string | null) =>
    pid
      ? recipes
          .filter((r) => r.productId === pid)
          .map((r) => String((r.topping.name as Record<string, unknown>)?.en ?? ""))
          .filter(Boolean)
      : [];

  const history = Array.isArray(o.statusHistory)
    ? (o.statusHistory as { status?: string; at?: string; by?: string }[])
    : [];

  const addr =
    o.address && typeof o.address === "object" && "text" in (o.address as Record<string, unknown>)
      ? String((o.address as Record<string, unknown>).text)
      : null;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>შეკვეთა #{o.orderNo}</h1>
          <p>
            {i18nText(o.branch.name)} · {o.fulfillmentType === "pickup" ? "წაღება" : "მიწოდება"} ·{" "}
            {new Date(o.createdAt).toLocaleString("ka-GE")}
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/orders">
          ← სია
        </Link>
      </div>

      <div className="admin-panel">
        <h2>სტატუსი — {LABEL[o.status] ?? o.status}</h2>
        {NEXT[o.status]?.length ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {NEXT[o.status].map((s) => {
              const go = setOrderStatus.bind(null, id, s);
              return (
                <form key={s} action={go}>
                  <button
                    className={s === "cancelled" ? "btn btn-ghost" : "btn"}
                    type="submit"
                    style={s === "cancelled" ? { color: "var(--a-danger)", borderColor: "#f3d5d2" } : undefined}
                  >
                    {LABEL[s]}
                  </button>
                </form>
              );
            })}
          </div>
        ) : (
          <p className="hint" style={{ margin: 0 }}>
            შეკვეთა დახურულია — სტატუსი აღარ იცვლება.
          </p>
        )}
      </div>

      <div className="admin-panel">
        <h2>კლიენტი</h2>
        <table className="admin-table">
          <tbody>
            <tr>
              <td style={{ width: 160 }}>სახელი</td>
              <td>{o.customerName ?? "—"}</td>
            </tr>
            <tr>
              <td>ტელეფონი</td>
              <td>{o.customerPhone ?? "—"}</td>
            </tr>
            {addr && (
              <tr>
                <td>მისამართი</td>
                <td>{addr}</td>
              </tr>
            )}
            {o.notes && (
              <tr>
                <td>შენიშვნა</td>
                <td>{o.notes}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-panel">
        <h2>პოზიციები</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>დასახელება</th>
              <th style={{ width: 130 }}>ტიპი</th>
              <th style={{ width: 70 }}>რაოდ.</th>
              <th style={{ width: 110 }}>ერთეული</th>
              <th style={{ width: 110 }}>ჯამი</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((it) => (
              <tr key={it.id}>
                <td>
                  <b>{i18nText(it.name)}</b>
                  {(() => {
                    const lines = detailLines(it.config, recipeOf(it.productId));
                    if (lines.length === 0) return null;
                    return (
                      <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 13, lineHeight: 1.6 }}>
                        {lines.map((l, i) => (
                          <li key={i} style={{ color: lineColor(l.kind) ?? "var(--a-muted)" }}>
                            {l.kind === "removed" ? "− " : l.kind === "added" ? "+ " : ""}
                            {l.text}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </td>
                <td>
                  <span className="hint">{KIND[it.kind] ?? it.kind}</span>
                </td>
                <td>{it.qty}</td>
                <td>{money(it.unitPrice)} ₾</td>
                <td>
                  <b>{money(it.lineTotal)} ₾</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="admin-table" style={{ marginTop: 16, maxWidth: 340, marginLeft: "auto" }}>
          <tbody>
            <tr>
              <td>ჯამი</td>
              <td style={{ textAlign: "right" }}>{money(o.subtotal)} ₾</td>
            </tr>
            <tr>
              <td>მიწოდება</td>
              <td style={{ textAlign: "right" }}>
                {Number(o.deliveryFee) > 0 ? `${money(o.deliveryFee)} ₾` : "უფასო"}
              </td>
            </tr>
            <tr>
              <td>
                <b>სულ</b>
              </td>
              <td style={{ textAlign: "right" }}>
                <b>{money(o.total)} ₾</b>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="hint" style={{ textAlign: "right", marginTop: 6 }}>
          ფასი სერვერზეა გამოთვლილი — კლიენტის მონაცემი არ გამოიყენება.
        </p>
      </div>

      {history.length > 0 && (
        <div className="admin-panel">
          <h2>ისტორია</h2>
          <table className="admin-table">
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td style={{ width: 180 }}>{LABEL[h.status ?? ""] ?? h.status}</td>
                  <td>
                    <span className="hint">{h.at ? new Date(h.at).toLocaleString("ka-GE") : ""}</span>
                  </td>
                  <td>
                    <span className="hint">{h.by ?? ""}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
