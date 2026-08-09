// scripts/patch-cart-photos.mjs
//
// კალათაში პროდუქტის ფოტო — ახლა სამივე პოზიციაზე მხოლოდ SLICE_SVG იხატება.
// SVG რჩება fallback-ად: თუ ფოტო არ არსებობს ან ვერ ჩაიტვირთა.
//
// ⚠️ თანმიმდევრობა მნიშვნელოვანია: ჯერ სამი ჩანაცვლება, მერე CartIcon-ის დამატება.
// (CartIcon თვითონ იყენებს იმავე SLICE_SVG-ს fallback-ად და დათვლას აფუჭებს.)
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "components/CartDrawer.tsx";
const CSS = "app/globals.css";

for (const f of [F, CSS]) {
  if (!existsSync(f)) {
    console.error(`ვერ ვიპოვე ${f} — გაუშვი repo-ს root-იდან.`);
    process.exit(1);
  }
}

let s = readFileSync(F, "utf8");

if (s.includes("function CartIcon")) {
  console.log("CartDrawer უკვე დაპატჩილია.");
} else {
  // ── 1) სამი ხატულა — რიგითობით: hh, simple, pizza ──
  const OLD = '<div className="ci-icon" dangerouslySetInnerHTML={{ __html: SLICE_SVG }} />';
  const parts = s.split(OLD);

  if (parts.length !== 4) {
    console.error(`⚠ ველოდი 3 ხატულას, ვიპოვე ${parts.length - 1} — ხელით შეამოწმე.`);
    process.exit(1);
  }

  const NEW = [
    "<CartIcon photo={PIZZA_PHOTOS[l.leftId] || PIZZA_PHOTOS[l.rightId]} />", // ნახევარ-ნახევარი
    "<CartIcon photo={simplePhoto(l)} />", // მარტივი
    "<CartIcon photo={pizza ? PIZZA_PHOTOS[pizza.id] : undefined} />", // პიცა
  ];

  s = parts[0] + NEW[0] + parts[1] + NEW[1] + parts[2] + NEW[2] + parts[3];

  // ── 2) იმპორტები ──
  if (!s.includes("PIZZA_PHOTOS")) {
    s = s.replace(/(\n\s*)PIZZAS,/, "$1PIZZAS,$1PIZZA_PHOTOS,");
    if (!s.includes("PIZZA_PHOTOS")) {
      console.error("⚠ ვერ ჩავამატე PIZZA_PHOTOS იმპორტი — შეამოწმე ხელით.");
      process.exit(1);
    }
  }

  if (!/import\s*\{[^}]*\buseState\b[^}]*\}\s*from\s*"react"/.test(s)) {
    s = s.replace('"use client";', '"use client";\nimport { useState } from "react";');
  }

  // ── 3) დამხმარეები (ბოლოს — რომ ჩანაცვლების დათვლაში არ ჩაერიოს) ──
  const helper = `/** მარტივი პოზიციის ფოტო — იმავე სიებიდან, საიდანაც სახელი. */
function simplePhoto(l: SimpleLine): string | undefined {
  for (const arr of [EXTRAS, SAUCES, DRINKS]) {
    const found = arr.find((x) => x.id === l.itemId);
    if (found?.photo) return found.photo;
  }
  return undefined;
}

/** კალათის ხატულა: ფოტო, ხოლო მისი არარსებობის/ჩავარდნის შემთხვევაში — ნაჭერი. */
function CartIcon({ photo }: { photo?: string }) {
  const [broken, setBroken] = useState(false);

  if (!photo || broken) {
    return <div className="ci-icon" dangerouslySetInnerHTML={{ __html: SLICE_SVG }} />;
  }
  return (
    <div className="ci-icon ci-icon-photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt="" onError={() => setBroken(true)} />
    </div>
  );
}

`;

  s = s.replace("export default function CartDrawer() {", helper + "export default function CartDrawer() {");

  copyFileSync(F, F + ".bak");
  writeFileSync(F, s);
  console.log("✓ components/CartDrawer.tsx (3 ხატულა შეიცვალა)");
}

// ── 4) სტილი ──
let css = readFileSync(CSS, "utf8");
if (css.includes(".ci-icon-photo")) {
  console.log("globals.css უკვე შეიცავს სტილს.");
} else {
  css += `

/* ── კალათის პოზიციის ფოტო ── */
.ci-icon-photo {
  overflow: hidden;
  border-radius: 8px;
  background: #f5f5f4;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.ci-icon-photo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
`;
  writeFileSync(CSS, css);
  console.log("✓ app/globals.css");
}

console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
