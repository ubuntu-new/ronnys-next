import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { i18nText } from "@/lib/admin-utils";
import { fmtQty } from "@/lib/stock";
import { approveTransfer, sendTransfer, receiveTransfer, cancelTransfer } from "../actions";
import { STATUS } from "../page";

export const dynamic = "force-dynamic";

const inp: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--a-line)",
  borderRadius: 6,
  font: "inherit",
};

export default async function TransferDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const t = await db.transfer.findUnique({
    where: { id },
    include: { from: true, to: true, lines: { include: { item: true } } },
  });
  if (!t) notFound();

  // ვინ რა გააკეთა — თანამშრომლების სახელები ერთი მოთხოვნით
  const actorIds = [t.requestedById, t.approvedById, t.sentById, t.receivedById, t.cancelledById]
    .filter((x): x is string => !!x);
  const actors = actorIds.length
    ? await db.employee.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
    : [];
  const nameOf = (eid: string | null) =>
    eid ? actors.find((a) => a.id === eid)?.name ?? eid : "—";

  // წყაროს ნაშთები — გაგზავნისას ვინმემ უნდა ნახოს, ჰყოფნის თუ არა
  const sourceLevels = await db.stockLevel.findMany({
    where: { locationId: t.fromLocationId, itemId: { in: t.lines.map((l) => l.itemId) } },
  });
  const haveAt = new Map(sourceLevels.map((l) => [l.itemId, Number(l.qty)]));

  const cancel = cancelTransfer.bind(null, id);
  const approve = approveTransfer.bind(null, id);
  const send = sendTransfer.bind(null, id);
  const receive = receiveTransfer.bind(null, id);

  const stages = [
    { label: "მოთხოვნა", by: t.requestedById, at: t.requestedAt },
    { label: "დამტკიცება", by: t.approvedById, at: t.approvedAt },
    { label: "გაგზავნა", by: t.sentById, at: t.sentAt },
    { label: "მიღება", by: t.receivedById, at: t.receivedAt },
    { label: "გაუქმება", by: t.cancelledById, at: t.cancelledAt },
  ].filter((s) => s.at);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>გადატანა #{t.no}</h1>
          <p>
            {i18nText(t.from.name)} → {i18nText(t.to.name)} · {STATUS[t.status] ?? t.status}
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/stock/transfers">
          ← სია
        </Link>
      </div>

      {sp.ok && <div className="alert alert-ok">შესრულდა.</div>}

      {/* ── ვინ რა გააკეთა ── */}
      <div className="admin-panel">
        <h2>ეტაპები</h2>
        <table className="admin-table">
          <tbody>
            {stages.map((s) => (
              <tr key={s.label}>
                <td style={{ width: 150 }}>{s.label}</td>
                <td style={{ width: 200 }}>{nameOf(s.by)}</td>
                <td>
                  <span className="hint">
                    {s.at ? new Date(s.at).toLocaleString("ka-GE") : ""}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {t.note && (
          <p className="hint" style={{ marginTop: 10 }}>
            შენიშვნა: {t.note}
          </p>
        )}
      </div>

      {/* ── პოზიციები ── */}
      <div className="admin-panel">
        <h2>პოზიციები</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ერთეული</th>
              <th style={{ width: 110 }}>მოთხოვნილი</th>
              <th style={{ width: 110 }}>დამტკიცებული</th>
              <th style={{ width: 110 }}>გაგზავნილი</th>
              <th style={{ width: 110 }}>მიღებული</th>
              <th style={{ width: 120 }}>წყაროშია</th>
            </tr>
          </thead>
          <tbody>
            {t.lines.map((l) => {
              const sent = l.qtySent != null ? Number(l.qtySent) : null;
              const recv = l.qtyReceived != null ? Number(l.qtyReceived) : null;
              const gap = sent != null && recv != null && sent !== recv;
              const have = haveAt.get(l.itemId) ?? 0;
              const short = t.status === "approved" && have < Number(l.qtyApproved ?? l.qtyRequested);

              return (
                <tr key={l.id}>
                  <td>
                    <Link href={`/admin/stock/items/${l.itemId}`}>{i18nText(l.item.name)}</Link>
                  </td>
                  <td>{fmtQty(Number(l.qtyRequested), l.item.unit)}</td>
                  <td>
                    {l.qtyApproved != null ? (
                      fmtQty(Number(l.qtyApproved), l.item.unit)
                    ) : (
                      <span className="hint">—</span>
                    )}
                  </td>
                  <td>{sent != null ? fmtQty(sent, l.item.unit) : <span className="hint">—</span>}</td>
                  <td>
                    {recv != null ? (
                      <b style={gap ? { color: "var(--a-danger)" } : undefined}>
                        {fmtQty(recv, l.item.unit)}
                      </b>
                    ) : (
                      <span className="hint">—</span>
                    )}
                  </td>
                  <td>
                    <span
                      className="hint"
                      style={short ? { color: "var(--a-danger)", fontWeight: 600 } : undefined}
                    >
                      {fmtQty(have, l.item.unit)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {t.status === "received" &&
          t.lines.some(
            (l) => l.qtySent != null && l.qtyReceived != null && Number(l.qtySent) !== Number(l.qtyReceived),
          ) && (
            <div className="alert alert-error" style={{ marginTop: 14 }}>
              <b>გაგზავნილი და მიღებული არ ემთხვევა.</b> სხვაობა ჟურნალშია და ნაშთებში
              აისახა — შეამოწმე, გზაში დაიკარგა თუ დათვლისას შეცდნენ.
            </div>
          )}
      </div>

      {/* ── მოქმედებები ── */}
      {t.status === "requested" && (
        <form className="admin-panel admin-form" action={approve} style={{ maxWidth: "none" }}>
          <h2>დამტკიცება</h2>
          <p className="hint" style={{ marginTop: -8 }}>
            რაოდენობა შეგიძლია შეცვალო — მოთხოვნილი და დამტკიცებული ცალკე შეინახება.
          </p>
          <table className="admin-table">
            <tbody>
              {t.lines.map((l) => (
                <tr key={l.id}>
                  <td>{i18nText(l.item.name)}</td>
                  <td style={{ width: 110 }}>
                    <span className="hint">
                      მოთხოვნილი {fmtQty(Number(l.qtyRequested), l.item.unit)}
                    </span>
                  </td>
                  <td style={{ width: 160 }}>
                    <input
                      name={`approve_${l.id}`}
                      type="number"
                      step="0.001"
                      min="0"
                      defaultValue={Number(l.qtyRequested)}
                      style={inp}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-actions" style={{ marginTop: 14 }}>
            <button className="btn" type="submit">
              დამტკიცება
            </button>
          </div>
        </form>
      )}

      {t.status === "approved" && (
        <form className="admin-panel admin-form" action={send} style={{ maxWidth: "none" }}>
          <h2>გაგზავნა</h2>
          <p className="hint" style={{ marginTop: -8 }}>
            ამ ღილაკზე მარაგი <b>წყაროს აკლდება</b>. „წყაროშია“ სვეტი გიჩვენებს, ჰყოფნის თუ არა.
          </p>
          <table className="admin-table">
            <tbody>
              {t.lines.map((l) => (
                <tr key={l.id}>
                  <td>{i18nText(l.item.name)}</td>
                  <td style={{ width: 140 }}>
                    <span className="hint">
                      წყაროშია {fmtQty(haveAt.get(l.itemId) ?? 0, l.item.unit)}
                    </span>
                  </td>
                  <td style={{ width: 160 }}>
                    <input
                      name={`send_${l.id}`}
                      type="number"
                      step="0.001"
                      min="0"
                      defaultValue={Number(l.qtyApproved ?? l.qtyRequested)}
                      style={inp}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-actions" style={{ marginTop: 14 }}>
            <button className="btn" type="submit">
              გაგზავნა
            </button>
          </div>
        </form>
      )}

      {t.status === "sent" && (
        <form className="admin-panel admin-form" action={receive} style={{ maxWidth: "none" }}>
          <h2>მიღება</h2>
          <p className="hint" style={{ marginTop: -8 }}>
            ჩაწერე <b>ფაქტობრივად</b> რამდენი მივიდა. თუ გაგზავნილს არ ემთხვევა, სხვაობა
            ჩაიწერება — ეს ნორმალურია და სწორედ ამისთვისაა.
          </p>
          <table className="admin-table">
            <tbody>
              {t.lines.map((l) => (
                <tr key={l.id}>
                  <td>{i18nText(l.item.name)}</td>
                  <td style={{ width: 140 }}>
                    <span className="hint">
                      გაგზავნილი {fmtQty(Number(l.qtySent ?? 0), l.item.unit)}
                    </span>
                  </td>
                  <td style={{ width: 160 }}>
                    <input
                      name={`receive_${l.id}`}
                      type="number"
                      step="0.001"
                      min="0"
                      defaultValue={Number(l.qtySent ?? 0)}
                      style={inp}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-actions" style={{ marginTop: 14 }}>
            <button className="btn" type="submit">
              მიღების დადასტურება
            </button>
          </div>
        </form>
      )}

      {!["received", "cancelled"].includes(t.status) && (
        <form action={cancel} style={{ marginTop: 16 }}>
          <button
            className="btn btn-ghost"
            type="submit"
            style={{ color: "var(--a-danger)", borderColor: "#f3d5d2" }}
          >
            გადატანის გაუქმება
            {t.status === "sent" && " (საქონელი დაბრუნდება წყაროში)"}
          </button>
        </form>
      )}
    </>
  );
}
