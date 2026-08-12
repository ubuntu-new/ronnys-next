import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/admin-auth";
import { i18nText } from "@/lib/admin-utils";
import { fmtQty } from "@/lib/stock";
import {
  periodOf,
  coreMetrics,
  costMetrics,
  labourCost,
  productBreakdown,
  branchBreakdown,
  hourlyLoad,
  productionYield,
  stockAlerts,
  fixedCosts,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

const money = (n: number) => n.toLocaleString("ka-GE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ერთი მაჩვენებელი — დიდი ციფრი, ქვეშ კონტექსტი. */
function Stat({
  value,
  label,
  sub,
  tone,
}: {
  value: string;
  label: string;
  sub?: string;
  tone?: "ok" | "warn" | "bad";
}) {
  const color =
    tone === "ok" ? "var(--a-ok)" : tone === "bad" ? "var(--a-danger)" : tone === "warn" ? "#8a6a12" : undefined;
  return (
    <div className="admin-stat">
      <b style={color ? { color } : undefined}>{value}</b>
      <span>{label}</span>
      {sub && (
        <span className="hint" style={{ display: "block", marginTop: 2 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className="hint" style={{ color: up ? "var(--a-ok)" : "var(--a-danger)" }}>
      {up ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

/** მარტივი ჰორიზონტალური ზოლი — გრაფიკის ბიბლიოთეკის გარეშე. */
function Bar({ value, max, tone = "var(--a-orange)" }: { value: number; max: number; tone?: string }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ background: "#f0efed", borderRadius: 4, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${w}%`, background: tone, height: "100%" }} />
    </div>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const sp = await searchParams;
  const days = Math.min(365, Math.max(1, Number(sp.d) || 30));
  const p = periodOf(days);

  const [session, core, costs, labour, products, branches, load, yieldStats, stock, fixed, pending] =
    await Promise.all([
      getSession(),
      coreMetrics(p),
      costMetrics(p),
      labourCost(p),
      productBreakdown(p),
      branchBreakdown(p),
      hourlyLoad(p),
      productionYield(p),
      stockAlerts(),
      fixedCosts(),
      db.order.count({ where: { status: "new" } }),
    ]);

  // ── ეკონომიკა ──
  const grossProfit = Math.round((core.revenue - costs.cogs) * 100) / 100;
  const foodCostPct = core.revenue > 0 ? Math.round((costs.cogs / core.revenue) * 1000) / 10 : null;
  const labourPct = core.revenue > 0 ? Math.round((labour.cost / core.revenue) * 1000) / 10 : null;
  const primeCost = Math.round((costs.cogs + labour.cost) * 100) / 100;
  const primePct = core.revenue > 0 ? Math.round((primeCost / core.revenue) * 1000) / 10 : null;

  // ფიქსირებული ხარჯი პერიოდზე გადაანგარიშებული
  const fixedForPeriod = fixed ? Math.round((fixed.monthly / 30) * days * 100) / 100 : null;
  const netProfit = fixedForPeriod !== null ? Math.round((grossProfit - labour.cost - fixedForPeriod) * 100) / 100 : null;

  const maxHour = Math.max(...load.hours.map((h) => h.count), 1);
  const maxBranch = Math.max(...branches.map((b) => b.revenue), 1);

  const noData = core.count === 0;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>დაფა</h1>
          <p>
            {session?.name} · ბოლო {p.label}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[1, 7, 30, 90].map((d) => (
            <Link key={d} className={days === d ? "btn" : "btn btn-ghost"} href={`/admin?d=${d}`}>
              {d === 1 ? "დღეს" : `${d} დღე`}
            </Link>
          ))}
        </div>
      </div>

      {/* ── საჭიროებს ყურადღებას ── */}
      {(pending > 0 || stock.low > 0) && (
        <div className="admin-panel" style={{ borderColor: "#f0d9a0" }}>
          <h2>საჭიროებს ყურადღებას</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {pending > 0 && (
              <Link className="btn" href="/admin/orders?status=new">
                {pending} დაუმუშავებელი შეკვეთა
              </Link>
            )}
            {stock.low > 0 && (
              <Link className="btn btn-ghost" href="/admin/stock/replenish">
                ⚠️ {stock.low} ერთეული ამოწურვის ზღვარზე
              </Link>
            )}
          </div>
        </div>
      )}

      {noData ? (
        <div className="admin-panel">
          <h2>ამ პერიოდში შეკვეთა არ ყოფილა</h2>
          <p className="hint" style={{ margin: 0 }}>
            აირჩიე უფრო გრძელი პერიოდი, ან დაელოდე პირველ შეკვეთებს. დაფა კვირებში
            ხდება სასარგებლო — ერთი დღის ციფრი ტენდენციას ვერ აჩვენებს.
          </p>
        </div>
      ) : (
        <>
          {/* ── ბრუნვა ── */}
          <div className="admin-stats">
            <Stat value={`${money(core.revenue)} ₾`} label="ბრუნვა" sub={`${money(core.perDay)} ₾ / დღე`} />
            <Stat value={String(core.count)} label="შეკვეთა" sub={`წინა პერიოდი: ${core.prevCount}`} />
            <Stat value={`${money(core.avgCheck)} ₾`} label="საშუალო ჩეკი" />
            <Stat
              value={grossProfit >= 0 ? `${money(grossProfit)} ₾` : `−${money(-grossProfit)} ₾`}
              label="მთლიანი მოგება"
              sub="ინგრედიენტების გამოკლებით"
              tone={grossProfit >= 0 ? "ok" : "bad"}
            />
            {core.deliveryShare !== null && (
              <Stat value={`${core.deliveryShare}%`} label="მიწოდება" sub="დანარჩენი — წაღება" />
            )}
            {core.growth !== null && (
              <Stat
                value={`${core.growth > 0 ? "+" : ""}${core.growth}%`}
                label="ზრდა"
                sub={`წინა ${p.label}-თან`}
                tone={core.growth >= 0 ? "ok" : "bad"}
              />
            )}
          </div>

          {/* ── ეკონომიკა ── */}
          <div className="admin-panel">
            <h2>ეკონომიკა</h2>
            <table className="admin-table">
              <tbody>
                <tr>
                  <td style={{ width: 260 }}>ბრუნვა</td>
                  <td style={{ width: 140 }}>
                    <b>{money(core.revenue)} ₾</b>
                  </td>
                  <td>
                    <Delta pct={core.growth} />
                  </td>
                </tr>
                <tr>
                  <td>ინგრედიენტები (COGS)</td>
                  <td>−{money(costs.cogs)} ₾</td>
                  <td>
                    {foodCostPct !== null && (
                      <span
                        className="badge"
                        style={
                          foodCostPct <= 33
                            ? { background: "#e8f2e8", color: "#3f7d3f" }
                            : { background: "#fdecea", color: "#b3261e" }
                        }
                      >
                        {foodCostPct}%
                      </span>
                    )}
                    <span className="hint"> · ნორმა 28–33%</span>
                  </td>
                </tr>
                <tr>
                  <td>შრომა</td>
                  <td>−{money(labour.cost)} ₾</td>
                  <td>
                    {labourPct !== null && (
                      <span
                        className="badge"
                        style={
                          labourPct <= 30
                            ? { background: "#e8f2e8", color: "#3f7d3f" }
                            : { background: "#fdf3d6", color: "#8a6a12" }
                        }
                      >
                        {labourPct}%
                      </span>
                    )}
                    <span className="hint">
                      {" "}
                      · {labour.hours} სთ, {labour.shifts} ცვლა
                      {labour.unpriced > 0 && ` · ${labour.unpriced} ცვლას განაკვეთი აკლია`}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderTop: "2px solid var(--a-line)" }}>
                  <td>
                    <b>Prime cost</b>
                  </td>
                  <td>
                    <b>{money(primeCost)} ₾</b>
                  </td>
                  <td>
                    {primePct !== null && (
                      <span
                        className="badge"
                        style={
                          primePct <= 65
                            ? { background: "#e8f2e8", color: "#3f7d3f" }
                            : { background: "#fdecea", color: "#b3261e" }
                        }
                      >
                        {primePct}%
                      </span>
                    )}
                    <span className="hint"> · ჯანსაღი რესტორანი ≤ 65%</span>
                  </td>
                </tr>
                {costs.waste > 0 && (
                  <tr>
                    <td>ჩამოწერა (გაფუჭდა)</td>
                    <td style={{ color: "var(--a-danger)" }}>−{money(costs.waste)} ₾</td>
                    <td>
                      <span className="hint">
                        {pct(costs.waste, core.revenue)}% ბრუნვისა
                      </span>
                    </td>
                  </tr>
                )}
                {costs.countAdjust !== 0 && (
                  <tr>
                    <td>ინვენტარიზაციის სხვაობა</td>
                    <td style={{ color: costs.countAdjust < 0 ? "var(--a-danger)" : undefined }}>
                      {costs.countAdjust > 0 ? "+" : ""}
                      {money(costs.countAdjust)} ₾
                    </td>
                    <td>
                      <span className="hint">
                        {costs.countAdjust < 0
                          ? "დანაკლისი — გადაჭარბებული პორცია, გაფუჭება ან ქურდობა"
                          : "ნამეტი — დათვლის შეცდომა ან აღურიცხავი მიღება"}
                      </span>
                    </td>
                  </tr>
                )}
                {fixedForPeriod !== null ? (
                  <>
                    <tr>
                      <td>ფიქსირებული ხარჯი</td>
                      <td>−{money(fixedForPeriod)} ₾</td>
                      <td>
                        <span className="hint">{money(fixed!.monthly)} ₾/თვე პროპორციულად</span>
                      </td>
                    </tr>
                    <tr style={{ borderTop: "2px solid var(--a-line)" }}>
                      <td>
                        <b>სუფთა მოგება</b>
                      </td>
                      <td>
                        <b style={{ color: netProfit! >= 0 ? "var(--a-ok)" : "var(--a-danger)" }}>
                          {netProfit! >= 0 ? "" : "−"}
                          {money(Math.abs(netProfit!))} ₾
                        </b>
                      </td>
                      <td>
                        <span className="hint">{pct(netProfit!, core.revenue)}% ბრუნვისა</span>
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={3}>
                      <span className="hint">
                        სუფთა მოგება არ ჩანს — ქირა და კომუნალური არ არის შეყვანილი.{" "}
                        <Link href="/admin/settings">დაამატე პარამეტრებში →</Link>
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {costs.cogs === 0 && (
              <div className="alert" style={{ background: "#fdf3d6", color: "#8a6a12", marginTop: 14 }}>
                <b>ინგრედიენტების ღირებულება ნულია.</b> ან ხარჯვის წესები არ არის, ან მიღებებს
                ფასი აკლია. <Link href="/admin/stock/consumption/bulk">შეავსე წესები →</Link>
              </div>
            )}
          </div>

          {/* ── ფილიალები ── */}
          {branches.length > 1 && (
            <div className="admin-panel">
              <h2>ფილიალები</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ფილიალი</th>
                    <th style={{ width: 90 }}>შეკვეთა</th>
                    <th style={{ width: 130 }}>ბრუნვა</th>
                    <th style={{ width: 120 }}>საშ. ჩეკი</th>
                    <th style={{ width: 200 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id}>
                      <td>{i18nText(b.name)}</td>
                      <td>{b.count}</td>
                      <td>
                        <b>{money(b.revenue)} ₾</b>
                      </td>
                      <td>{b.count > 0 ? `${money(b.avgCheck)} ₾` : <span className="hint">—</span>}</td>
                      <td>
                        <Bar value={b.revenue} max={maxBranch} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── საათობრივი დატვირთვა ── */}
          <div className="admin-panel">
            <h2>საათობრივი დატვირთვა</h2>
            <p className="hint" style={{ marginTop: -8, marginBottom: 14 }}>
              პიკი <b>{load.peak.hour}:00</b> — {load.peak.count} შეკვეთა. ცვლების გრაფიკი ამ
              რიცხვებს უნდა მიჰყვებოდეს.
            </p>
            <table className="admin-table">
              <tbody>
                {load.hours
                  .filter((h) => h.count > 0)
                  .map((h) => (
                    <tr key={h.hour}>
                      <td style={{ width: 70 }}>
                        {String(h.hour).padStart(2, "0")}:00
                      </td>
                      <td style={{ width: 70 }}>{h.count}</td>
                      <td style={{ width: 120 }}>
                        <span className="hint">{money(h.revenue)} ₾</span>
                      </td>
                      <td>
                        <Bar value={h.count} max={maxHour} tone={h.hour === load.peak.hour ? "var(--a-saffron)" : undefined} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* ── პროდუქტები ── */}
          <div className="admin-panel">
            <h2>ტოპ პროდუქტები</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>პროდუქტი</th>
                  <th style={{ width: 90 }}>ცალი</th>
                  <th style={{ width: 130 }}>ბრუნვა</th>
                </tr>
              </thead>
              <tbody>
                {products.byRevenue.map((x, i) => (
                  <tr key={i}>
                    <td>
                      {x.productId ? (
                        <Link href={`/admin/products/${x.productId}`}>{i18nText(x.name)}</Link>
                      ) : (
                        i18nText(x.name)
                      )}
                    </td>
                    <td>{x.qty}</td>
                    <td>
                      <b>{money(x.revenue)} ₾</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint" style={{ marginTop: 12 }}>
              ⚠️ ყველაზე გაყიდვადი ხშირად ყველაზე ნაკლებმომგებიანია —{" "}
              <Link href="/admin/stock/costing">ნახე მოგება პროდუქტზე →</Link>
            </p>
          </div>

          {/* ── წარმოება ── */}
          {yieldStats && (
            <div className="admin-panel">
              <h2>წარმოების გამოსავალი</h2>
              <div className="admin-stats" style={{ marginBottom: 0 }}>
                <Stat value={String(yieldStats.batches)} label="პარტია" />
                <Stat value={money(yieldStats.planned)} label="დაგეგმილი" />
                <Stat value={money(yieldStats.actual)} label="ფაქტობრივი" />
                <Stat
                  value={`${yieldStats.pct}%`}
                  label="გამოსავალი"
                  tone={yieldStats.pct! >= 95 ? "ok" : "bad"}
                  sub={yieldStats.pct! < 95 ? "რეცეპტი ან დანაკარგი" : undefined}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── მარაგი ── */}
      <div className="admin-panel">
        <h2>მარაგი</h2>
        <div className="admin-stats" style={{ marginBottom: stock.items.length ? 14 : 0 }}>
          <Stat value={`${money(stock.stockValue)} ₾`} label="მარაგის ღირებულება" />
          <Stat
            value={String(stock.low)}
            label="ამოწურვის ზღვარზე"
            tone={stock.low > 0 ? "warn" : "ok"}
          />
        </div>
        {stock.items.length > 0 && (
          <table className="admin-table">
            <tbody>
              {stock.items.map((l) => (
                <tr key={l.id}>
                  <td>{i18nText(l.item.name)}</td>
                  <td style={{ width: 160 }}>
                    <span className="hint">{i18nText(l.location.name)}</span>
                  </td>
                  <td style={{ width: 120 }}>
                    <b style={{ color: "var(--a-danger)" }}>
                      {fmtQty(Number(l.qty), l.item.unit)}
                    </b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-panel">
        <h2>რას ნიშნავს ეს რიცხვები</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: "var(--a-muted)" }}>
          <li>
            <b>Food cost 28–33%</b> — რესტორნის ნორმა. თუ მაღალია, ან ფასი დაბალია, ან პორცია
            დიდი, ან დანაკარგია.
          </li>
          <li>
            <b>Prime cost ≤ 65%</b> — ინგრედიენტები + შრომა. ეს ერთი რიცხვი ყველაზე მეტს ამბობს
            რესტორნის ჯანმრთელობაზე.
          </li>
          <li>
            <b>ინვენტარიზაციის სხვაობა</b> — ის, რაც ჩუმად ჭამს მოგებას. ბრუნვა ყველამ იცის;
            ეს რიცხვი — არავინ.
          </li>
          <li>
            <b>მთლიანი მოგება ≠ სუფთა მოგება.</b> აქ არ შედის საბანკო საკომისიო, გადასახადები
            და ამორტიზაცია — რეალური მოგება ამაზე დაბალია.
          </li>
        </ul>
      </div>
    </>
  );
}

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 1000) / 10 : null;
}
