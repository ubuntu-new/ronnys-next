import Link from "next/link";
import { i18nText } from "@/lib/admin-utils";
import { computeMenuCosts, stockValue } from "@/lib/costing";

export const dynamic = "force-dynamic";

const money = (n: number) => n.toFixed(2);

function MarginBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="hint">—</span>;
  const tone =
    pct >= 60
      ? { background: "#e8f2e8", color: "#3f7d3f" }
      : pct >= 35
        ? { background: "#fdf3d6", color: "#8a6a12" }
        : { background: "#fdecea", color: "#b3261e" };
  return (
    <span className="badge" style={tone}>
      {pct}%
    </span>
  );
}

export default async function CostingPage() {
  const [{ products, toppings }, values] = await Promise.all([computeMenuCosts(), stockValue()]);

  const totalValue = values.reduce((s, v) => s + v.value, 0);
  const unpriced = values.reduce((s, v) => s + v.unpriced, 0);

  const sorted = [...products].sort((a, b) => {
    if (a.marginPct === null) return 1;
    if (b.marginPct === null) return -1;
    return a.marginPct - b.marginPct;
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>თვითღირებულება</h1>
          <p>
            მარაგის ღირებულება <b>{money(totalValue)} ₾</b>
            {unpriced > 0 && ` · ${unpriced} ერთეულს ფასი აკლია`}
          </p>
        </div>
        <Link className="btn btn-ghost" href="/admin/stock">
          ← მარაგი
        </Link>
      </div>

      {unpriced > 0 && (
        <div className="alert" style={{ background: "#fdf3d6", color: "#8a6a12" }}>
          <b>{unpriced} ერთეულს საშუალო ღირებულება არ აქვს.</b> ღირებულება მიღებისას იწერება —
          ჩაწერე შესყიდვის ფასი შემდეგ მიღებაზე და რიცხვები შეივსება.
        </div>
      )}

      {/* ── მარაგის ღირებულება ── */}
      <div className="admin-panel">
        <h2>მარაგის ღირებულება</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ლოკაცია</th>
              <th style={{ width: 110 }}>ერთეული</th>
              <th style={{ width: 140 }}>ღირებულება</th>
              <th style={{ width: 130 }}>ფასის გარეშე</th>
            </tr>
          </thead>
          <tbody>
            {values.map((v) => (
              <tr key={v.location.id}>
                <td>
                  {i18nText(v.location.name)}
                  {v.location.type === "warehouse" && <span className="hint"> ⭐</span>}
                </td>
                <td>{v.items}</td>
                <td>
                  <b>{money(v.value)} ₾</b>
                </td>
                <td>
                  {v.unpriced > 0 ? (
                    <span className="badge" style={{ background: "#fdf3d6", color: "#8a6a12" }}>
                      {v.unpriced}
                    </span>
                  ) : (
                    <span className="hint">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── პროდუქტები ── */}
      <div className="admin-panel">
        <h2>პროდუქტების მოგება</h2>
        <p className="hint" style={{ marginTop: -8, marginBottom: 14 }}>
          დალაგებულია <b>ყველაზე დაბალი მოგებით ზემოთ</b> — სწორედ ისინი საჭიროებენ ყურადღებას.
        </p>

        {sorted.length === 0 ? (
          <p className="hint" style={{ margin: 0 }}>
            ხარჯვის წესები ჯერ არ არის.{" "}
            <Link href="/admin/stock/consumption">დაამატე ისინი →</Link>
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>პროდუქტი</th>
                <th style={{ width: 70 }}>ზომა</th>
                <th style={{ width: 110 }}>ღირებულება</th>
                <th style={{ width: 110 }}>ფასი</th>
                <th style={{ width: 110 }}>მოგება</th>
                <th style={{ width: 90 }}>%</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={`${p.productId}-${p.sizeKey}-${i}`}>
                  <td>
                    {p.productId ? (
                      <Link href={`/admin/products/${p.productId}`}>{i18nText(p.name)}</Link>
                    ) : (
                      i18nText(p.name)
                    )}
                    <div className="hint">
                      {p.lines
                        .map((l) => `${i18nText(l.name)} ${l.qty}${l.unit}`)
                        .join(" · ")}
                    </div>
                    {p.missing > 0 && (
                      <div className="hint" style={{ color: "var(--a-danger)" }}>
                        {p.missing} ინგრედიენტს ფასი აკლია — ღირებულება არასრულია
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="hint">{p.sizeKey ?? "—"}</span>
                  </td>
                  <td>{money(p.cost)} ₾</td>
                  <td>{p.price != null ? `${money(p.price)} ₾` : <span className="hint">—</span>}</td>
                  <td>
                    {p.margin != null ? (
                      <b style={p.margin < 0 ? { color: "var(--a-danger)" } : undefined}>
                        {money(p.margin)} ₾
                      </b>
                    ) : (
                      <span className="hint">—</span>
                    )}
                  </td>
                  <td>
                    <MarginBadge pct={p.marginPct} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── ტოპინგები ── */}
      {toppings.length > 0 && (
        <div className="admin-panel">
          <h2>ტოპინგების მოგება</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ტოპინგი</th>
                <th style={{ width: 70 }}>ზომა</th>
                <th style={{ width: 110 }}>ღირებულება</th>
                <th style={{ width: 110 }}>დანამატის ფასი</th>
                <th style={{ width: 110 }}>მოგება</th>
                <th style={{ width: 90 }}>%</th>
              </tr>
            </thead>
            <tbody>
              {toppings.map((t, i) => (
                <tr key={`${t.toppingId}-${t.sizeKey}-${i}`}>
                  <td>
                    {t.toppingId ? (
                      <Link href={`/admin/toppings/${t.toppingId}`}>{i18nText(t.name)}</Link>
                    ) : (
                      i18nText(t.name)
                    )}
                    <div className="hint">
                      {t.lines.map((l) => `${i18nText(l.name)} ${l.qty}${l.unit}`).join(" · ")}
                    </div>
                  </td>
                  <td>
                    <span className="hint">{t.sizeKey ?? "ყველა"}</span>
                  </td>
                  <td>{money(t.cost)} ₾</td>
                  <td>{t.price != null ? `${money(t.price)} ₾` : <span className="hint">—</span>}</td>
                  <td>
                    {t.margin != null ? (
                      <b style={t.margin < 0 ? { color: "var(--a-danger)" } : undefined}>
                        {money(t.margin)} ₾
                      </b>
                    ) : (
                      <span className="hint">—</span>
                    )}
                  </td>
                  <td>
                    <MarginBadge pct={t.marginPct} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-panel">
        <h2>როგორ ითვლება</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: "var(--a-muted)" }}>
          <li>
            <b>მოძრავი საშუალო:</b> მიღებისას ახალი ფასი ძველ ნაშთს ერევა.
            20კგ × 8₾ + 10კგ × 11₾ = 30კგ × <b>9₾</b>.
          </li>
          <li>
            ღირებულება <b>საწარმოს</b> ლოკაციიდან მოდის — ის ცენტრალური მიღების წერტილია.
          </li>
          <li>
            თუ ინგრედიენტს ფასი აკლია, ის ჯამში <b>არ ითვლება</b> — ამიტომ ღირებულება
            რეალურზე დაბალი გამოჩნდება. სვეტში გაფრთხილება წერია.
          </li>
          <li>
            ეს <b>ინგრედიენტების</b> ღირებულებაა. შრომა, ენერგია და ქირა არ შედის —
            რეალური მოგება ამაზე დაბალია.
          </li>
        </ul>
      </div>
    </>
  );
}
