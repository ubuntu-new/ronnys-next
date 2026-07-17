"use client";

import { useState } from "react";
import { useCart, type CartLine } from "@/lib/cart";
import { useLang } from "@/lib/i18n";
import {
  PIZZAS,
  EXTRAS,
  SAUCES,
  DRINKS,
  LOCATIONS,
  MIN_ORDER,
  FREE_DELIVERY,
  DELIVERY_FEE,
  pName,
  itemName,
  type Lang,
} from "@/lib/data";
import { SIZE_KEYS, fmt } from "@/lib/pricing";

function lineLabel(l: CartLine, lang: Lang, t: (k: string) => string): string {
  if (l.kind === "pizza") {
    const p = PIZZAS.find((x) => x.id === l.pizzaId);
    return `${p ? pName(p, lang) : "Pizza"} · ${t(SIZE_KEYS[l.sizeIdx])}`;
  }
  if (l.kind === "hh") {
    const L = PIZZAS.find((x) => x.id === l.leftId);
    const R = PIZZAS.find((x) => x.id === l.rightId);
    return `${t("hh_title")}: ${L ? pName(L, lang) : "?"} / ${R ? pName(R, lang) : "?"}`;
  }
  for (const arr of [EXTRAS, SAUCES, DRINKS]) {
    const found = arr.find((x) => x.id === l.itemId || l.itemId.startsWith(x.id + "|"));
    if (found) return itemName(found, lang);
  }
  return l.name;
}

export default function Checkout() {
  const { checkoutOpen, closeCheckout, lines, subtotal, clearCart } = useCart();
  const { lang, t } = useLang();

  const [mode, setMode] = useState<"delivery" | "pickup">("delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [branchId, setBranchId] = useState<string>(LOCATIONS[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [placed, setPlaced] = useState(false);

  if (!checkoutOpen) return null;

  const fee = mode === "delivery" && subtotal < FREE_DELIVERY ? DELIVERY_FEE : 0;
  const grand = Math.round((subtotal + fee) * 100) / 100;
  const canPlace =
    name.trim() !== "" &&
    phone.trim() !== "" &&
    subtotal >= MIN_ORDER &&
    (mode === "pickup" ? branchId !== "" : address.trim() !== "");

  const finish = () => {
    clearCart();
    setPlaced(false);
    setName("");
    setPhone("");
    setAddress("");
    setNotes("");
    closeCheckout();
  };

  const onOverlay = (e: React.MouseEvent) => {
    if (!placed && (e.target as HTMLElement).classList.contains("checkout-overlay")) closeCheckout();
  };

  return (
    <div className="checkout-overlay" onClick={onOverlay}>
      <div className="checkout-sheet">
        {placed ? (
          <div className="checkout-success">
            <div className="cs-ring">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3>{t("co_success_title")}</h3>
            <p>{t("co_success_msg").replace("{name}", name.trim() || "")}</p>
            <button className="place-order-btn" style={{ maxWidth: 220 }} onClick={finish}>
              OK
            </button>
          </div>
        ) : (
          <>
            <div className="checkout-head">
              <button className="checkout-back" onClick={closeCheckout}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("co_back")}
              </button>
              <h3>{t("checkout_title")}</h3>
              <span style={{ width: 48 }} />
            </div>

            <div className="checkout-body">
              <div className="co-seg-wrap">
                <div className="segment full">
                  <button className={mode === "delivery" ? "active" : ""} onClick={() => setMode("delivery")}>
                    {t("co_delivery")}
                  </button>
                  <button className={mode === "pickup" ? "active" : ""} onClick={() => setMode("pickup")}>
                    {t("co_pickup")}
                  </button>
                </div>
              </div>

              <div className="co-field">
                <label>{t("co_name")}</label>
                <input className="co-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("co_name_ph")} />
              </div>
              <div className="co-field">
                <label>{t("co_phone")}</label>
                <input className="co-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("co_phone_ph")} inputMode="tel" />
              </div>

              {mode === "delivery" ? (
                <div className="co-field">
                  <label>{t("co_address")}</label>
                  <input className="co-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("co_address_ph")} />
                </div>
              ) : (
                <div className="co-field">
                  <label>{t("co_branch")}</label>
                  <select className="co-input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                    {LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {lang === "ka" ? loc.branch_ka : loc.branch}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="co-field">
                <label>{t("co_notes")}</label>
                <textarea className="co-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="co-review">
                <label style={{ display: "block", fontSize: "var(--text-micro)", fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>
                  {t("co_your_order")}
                </label>
                {lines.map((l, i) => (
                  <div className="co-review-row" key={i}>
                    <span className="cr-name">
                      {l.qty}× {lineLabel(l, lang, t)}
                    </span>
                    <span className="cr-price">{fmt(l.price * l.qty)}</span>
                  </div>
                ))}
                <div className="co-sum">
                  <div className="co-sum-row">
                    <span>{t("subtotal")}</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                  <div className="co-sum-row">
                    <span>{mode === "delivery" ? t("delivery_fee") : t("co_pickup")}</span>
                    <span>{fee > 0 ? fmt(fee) : t("free")}</span>
                  </div>
                  <div className="co-sum-row grand">
                    <span>{t("total")}</span>
                    <span>{fmt(grand)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="checkout-foot">
              <button className="place-order-btn" onClick={() => setPlaced(true)} disabled={!canPlace}>
                {t("place_order")} · {fmt(grand)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
