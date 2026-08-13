// scripts/patch-checkout-detail.mjs
//
// Checkout-ის სიაში მხოლოდ პროდუქტის სახელი ჩანდა — არც ტოპინგები,
// არც ცომი, არც სოუსი. კლიენტმა შეკვეთამდე უნდა ნახოს რას უკვეთავს.
//
// იმავე `detailLines()`-ს ვიყენებთ, რასაც KDS და შეკვეთის დეტალი —
// ერთი წყარო სამივესთვის.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "components/Checkout.tsx";
if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }

let s = readFileSync(F, "utf8");

if (s.includes("detailLines")) {
  console.log("უკვე დაპატჩილია.");
  process.exit(0);
}

copyFileSync(F, F + ".bak");

// იმპორტი
s = s.replace(
  'import { SIZE_KEYS, fmt } from "@/lib/pricing";',
  'import { SIZE_KEYS, fmt } from "@/lib/pricing";\nimport { detailLines, lineColor } from "@/lib/item-detail";',
);

// ინგრედიენტების მოძებნა კალათის ხაზისთვის
s = s.replace(
  "export default function Checkout() {",
  `/** კალათის ხაზი → ინგრედიენტების სია (პიცასა და ნახევარ-ნახევარზე). */
function lineIngredients(l: CartLine): string[] {
  if (l.kind === "pizza") return PIZZAS.find((p) => p.id === l.pizzaId)?.ings ?? [];
  if (l.kind === "hh") {
    const L = PIZZAS.find((p) => p.id === l.leftId)?.ings ?? [];
    const R = PIZZAS.find((p) => p.id === l.rightId)?.ings ?? [];
    return [...new Set([...L, ...R])];
  }
  return [];
}

export default function Checkout() {`,
);

// მიმოხილვის სტრიქონი — დეტალებით
const old = `                {lines.map((l, i) => (
                  <div className="co-review-row" key={i}>
                    <span className="cr-name">
                      {l.qty}× {lineLabel(l, lang, t)}
                    </span>
                    <span className="cr-price">{fmt(l.price * l.qty)}</span>
                  </div>
                ))}`;

const neu = `                {lines.map((l, i) => {
                  const detail = detailLines(l, lineIngredients(l));
                  return (
                    <div className="co-review-row" key={i}>
                      <span className="cr-name">
                        {l.qty}× {lineLabel(l, lang, t)}
                        {detail.length > 0 && (
                          <span className="cr-detail">
                            {detail.map((d, j) => (
                              <span key={j} style={{ color: lineColor(d.kind) }}>
                                {j > 0 && " · "}
                                {d.kind === "removed" ? "− " : d.kind === "added" ? "+ " : ""}
                                {d.text}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                      <span className="cr-price">{fmt(l.price * l.qty)}</span>
                    </div>
                  );
                })}`;

if (!s.includes(old)) {
  console.error("⚠ ვერ ვიპოვე მიმოხილვის სტრიქონი — ხელით შეამოწმე Checkout.tsx");
  process.exit(1);
}
s = s.replace(old, neu);

writeFileSync(F, s);
console.log("✓ components/Checkout.tsx");

// ── სტილი ──
const CSS = "app/globals.css";
let css = readFileSync(CSS, "utf8");
if (css.includes(".cr-detail")) {
  console.log("globals.css უკვე შეიცავს სტილს");
} else {
  css += `

/* checkout review — item detail */
.cr-detail {
  display: block;
  font-size: var(--text-micro, 12px);
  line-height: 1.5;
  opacity: .85;
  margin-top: 2px;
}
`;
  writeFileSync(CSS, css);
  console.log("✓ app/globals.css");
}

console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
