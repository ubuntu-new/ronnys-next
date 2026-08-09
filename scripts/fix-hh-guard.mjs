// scripts/fix-hh-guard.mjs
//
// MenuBody-ში ნახევარ-ნახევრის პრესეტები `!` (non-null assertion) გამოიყენებდნენ:
//
//   const L = PIZZAS.find((p) => p.id === c.leftId)!;
//   const price = (L.sizes[1] / 2 + ...)      ← L undefined-ია → მთელი გვერდი ეცემა
//
// HH_COMBOS ფიქსირებულ id-ებზეა (1,2,3,4,8,9). თუ რომელიმე პიცა მენიუში აღარაა —
// admin-ში გამორთული, არქივში, ან ფილიალში მიუწვდომელი — საიტი ჩამოვარდებოდა.
//
// გასწორება: თუ პრესეტის რომელიმე პიცა არ არსებობს, ის ბარათი უბრალოდ არ იხატება.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "components/MenuBody.tsx";
if (!existsSync(F)) {
  console.error(`ვერ ვიპოვე ${F} — გაუშვი repo-ს root-იდან.`);
  process.exit(1);
}

let s = readFileSync(F, "utf8");

const OLD = `          const L = PIZZAS.find((p) => p.id === c.leftId)!;
          const R = PIZZAS.find((p) => p.id === c.rightId)!;`;

const NEW = `          const L = PIZZAS.find((p) => p.id === c.leftId);
          const R = PIZZAS.find((p) => p.id === c.rightId);
          // პრესეტის პიცა შეიძლება აღარ იყოს მენიუში (გამორთული / არქივში /
          // ამ ფილიალში მიუწვდომელი) — მაშინ ბარათს საერთოდ არ ვხატავთ.
          if (!L || !R) return null;`;

if (s.includes("if (!L || !R) return null;")) {
  console.log("უკვე დაცულია — არაფერი შევცვალე.");
  process.exit(0);
}

if (!s.includes(OLD)) {
  console.error("⚠ ვერ ვიპოვე მოსალოდნელი კოდი — ხელით შეამოწმე MenuBody.tsx-ის ~133 ხაზი.");
  process.exit(1);
}

copyFileSync(F, F + ".bak");
writeFileSync(F, s.replace(OLD, NEW));

console.log("✓ components/MenuBody.tsx — HH პრესეტები დაცულია");
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
