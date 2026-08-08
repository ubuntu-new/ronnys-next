import { db } from "@/lib/db";
import {
  saveOrderSettings,
  saveLoyaltySettings,
  saveEmployeeDiscount,
  saveDiscountRules,
  saveTax,
  saveSocial,
} from "./actions";

export const dynamic = "force-dynamic";

type Bag = Record<string, unknown>;

function obj(v: unknown): Bag {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Bag) : {};
}
function n(v: unknown, d = 0): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}
function b(v: unknown, d = false): boolean {
  return typeof v === "boolean" ? v : d;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const sp = await searchParams;

  const rows = await db.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;

  const order = obj(map.order);
  const loyalty = obj(map.loyalty);
  const emp = obj(map.employeeDiscount);
  const rules = obj(map.discountRules);
  const verif = obj(map.discountVerification);
  const tax = obj(map.tax);
  const social = Array.isArray(map.social) ? (map.social as Bag[]) : [];

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>პარამეტრები</h1>
          <p>ყველა მნიშვნელობა აქედან იმართება</p>
        </div>
      </div>

      {sp.saved && <div className="alert alert-ok">შენახულია: {sp.saved}</div>}

      {/* ── შეკვეთა ── */}
      <form className="admin-panel admin-form" action={saveOrderSettings} style={{ maxWidth: "none" }}>
        <h2>შეკვეთა და მიწოდება</h2>
        <div className="field-row">
          <div className="field">
            <label htmlFor="minOrder">მინიმალური შეკვეთა (₾)</label>
            <input id="minOrder" name="minOrder" type="number" step="0.01" min="0" defaultValue={n(order.minOrder, 25)} />
          </div>
          <div className="field">
            <label htmlFor="deliveryFee">მიწოდების საფასური (₾)</label>
            <input id="deliveryFee" name="deliveryFee" type="number" step="0.01" min="0" defaultValue={n(order.deliveryFee, 5.5)} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="freeDeliveryThreshold">უფასო მიწოდება ზღვარი (₾)</label>
            <input id="freeDeliveryThreshold" name="freeDeliveryThreshold" type="number" step="0.01" min="0" defaultValue={n(order.freeDeliveryThreshold, 60)} />
          </div>
          <div className="field">
            <label htmlFor="maxToppings">მაქს. ტოპინგი პიცაზე</label>
            <input id="maxToppings" name="maxToppings" type="number" min="1" defaultValue={n(order.maxToppings, 6)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="currency">ვალუტა</label>
          <input id="currency" name="currency" type="text" defaultValue={String(order.currency ?? "GEL")} />
        </div>
        <div className="form-actions">
          <button className="btn" type="submit">შენახვა</button>
        </div>
      </form>

      {/* ── ლოიალობა ── */}
      <form className="admin-panel admin-form" action={saveLoyaltySettings} style={{ maxWidth: "none" }}>
        <h2>ლოიალობის ქულები</h2>
        <div className="field-check">
          <input id="l_enabled" name="enabled" type="checkbox" defaultChecked={b(loyalty.enabled, true)} />
          <label htmlFor="l_enabled">ჩართულია</label>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="pointsPerGel">ქულა 1 ₾-ზე</label>
            <input id="pointsPerGel" name="pointsPerGel" type="number" step="0.01" min="0" defaultValue={n(loyalty.pointsPerGel, 1)} />
          </div>
          <div className="field">
            <label htmlFor="redeemRate">1 ქულის ღირებულება (₾)</label>
            <input id="redeemRate" name="redeemRate" type="number" step="0.01" min="0" defaultValue={n(loyalty.redeemRate, 0.1)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="minRedeem">მინიმალური განაღდება (ქულა)</label>
          <input id="minRedeem" name="minRedeem" type="number" min="0" defaultValue={n(loyalty.minRedeem, 100)} />
          <span className="hint">ამჟამად: 100 ქულა = {(n(loyalty.minRedeem, 100) * n(loyalty.redeemRate, 0.1)).toFixed(2)} ₾</span>
        </div>
        <div className="form-actions">
          <button className="btn" type="submit">შენახვა</button>
        </div>
      </form>

      {/* ── თანამშრომლის ფასდაკლება ── */}
      <form className="admin-panel admin-form" action={saveEmployeeDiscount} style={{ maxWidth: "none" }}>
        <h2>თანამშრომლის ფასდაკლება</h2>
        <div className="field-check">
          <input id="e_enabled" name="enabled" type="checkbox" defaultChecked={b(emp.enabled, true)} />
          <label htmlFor="e_enabled">ჩართულია</label>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="e_value">ოდენობა</label>
            <input id="e_value" name="value" type="number" step="0.01" min="0" defaultValue={n(emp.value, 30)} />
          </div>
          <div className="field">
            <label htmlFor="e_mode">ტიპი</label>
            <select id="e_mode" name="mode" defaultValue={String(emp.mode ?? "percent")}>
              <option value="percent">პროცენტი (%)</option>
              <option value="fixed">ფიქსირებული (₾)</option>
            </select>
          </div>
        </div>
        <div className="field-check">
          <input id="appliesEverywhere" name="appliesEverywhere" type="checkbox" defaultChecked={b(emp.appliesEverywhere, true)} />
          <label htmlFor="appliesEverywhere">ყველა ფილიალში მოქმედებს</label>
        </div>
        <div className="form-actions">
          <button className="btn" type="submit">შენახვა</button>
        </div>
      </form>

      {/* ── ფასდაკლების წესები ── */}
      <form className="admin-panel admin-form" action={saveDiscountRules} style={{ maxWidth: "none" }}>
        <h2>ფასდაკლების წესები</h2>
        <div className="field-check">
          <input id="stackable" name="stackable" type="checkbox" defaultChecked={b(rules.stackable, false)} />
          <label htmlFor="stackable">ფასდაკლებები ჯამდება</label>
        </div>
        <div className="field-check">
          <input id="excludeCombos" name="excludeCombos" type="checkbox" defaultChecked={b(rules.excludeCombos, true)} />
          <label htmlFor="excludeCombos">კომბოზე არ ვრცელდება</label>
        </div>
        <div className="field-check">
          <input id="excludePromoProducts" name="excludePromoProducts" type="checkbox" defaultChecked={b(rules.excludePromoProducts, true)} />
          <label htmlFor="excludePromoProducts">აქციურ პროდუქტზე არ ვრცელდება</label>
        </div>
        <div className="field">
          <label htmlFor="verification">ვერიფიკაცია (სტუდენტი/დიპლომატი)</label>
          <select id="verification" name="verification" defaultValue={String(verif.mode ?? "manual")}>
            <option value="manual">ხელით დადასტურება</option>
            <option value="upload">დოკუმენტის ატვირთვა</option>
          </select>
          <span className="hint">„ატვირთვა" ფაილების საცავს მოითხოვს — ჯერ არ გვაქვს.</span>
        </div>
        <div className="form-actions">
          <button className="btn" type="submit">შენახვა</button>
        </div>
      </form>

      {/* ── გადასახადი ── */}
      <form className="admin-panel admin-form" action={saveTax} style={{ maxWidth: "none" }}>
        <h2>გადასახადი</h2>
        <div className="field-row">
          <div className="field">
            <label htmlFor="rate">განაკვეთი (%)</label>
            <input id="rate" name="rate" type="number" step="0.01" min="0" defaultValue={n(tax.rate, 0)} />
          </div>
          <div className="field" style={{ alignContent: "end" }}>
            <div className="field-check">
              <input id="inclusive" name="inclusive" type="checkbox" defaultChecked={b(tax.inclusive, true)} />
              <label htmlFor="inclusive">ფასში ჩართულია</label>
            </div>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn" type="submit">შენახვა</button>
        </div>
      </form>

      {/* ── სოც. ქსელები ── */}
      <form className="admin-panel admin-form" action={saveSocial} style={{ maxWidth: "none" }}>
        <h2>სოციალური ქსელები (ფუტერი)</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 120 }}>ქსელი</th>
              <th>ბმული</th>
              <th style={{ width: 90 }}>ჩანს</th>
            </tr>
          </thead>
          <tbody>
            {social.map((s) => {
              const id = String(s.id);
              return (
                <tr key={id}>
                  <td>{String(s.label ?? id)}</td>
                  <td>
                    <input
                      name={`href_${id}`}
                      type="text"
                      defaultValue={String(s.href ?? "")}
                      placeholder="https://…"
                      style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--a-line)", borderRadius: 6, font: "inherit" }}
                    />
                  </td>
                  <td>
                    <input type="checkbox" name={`enabled_${id}`} defaultChecked={b(s.enabled, false)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="form-actions" style={{ marginTop: 14 }}>
          <button className="btn" type="submit">შენახვა</button>
        </div>
      </form>
    </>
  );
}
