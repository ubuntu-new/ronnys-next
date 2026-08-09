// scripts/patch-data-hydration.mjs
//
// `lib/data.ts`-ს ხელით არ ვწერთ თავიდან — ვამატებთ ჰიდრატაციის შესაძლებლობას:
//   1. `export const X` → `export let X` იმ ცვლადებზე, რომლებიც ბაზიდან ივსება
//   2. ბოლოში ემატება `MenuPayload` ტიპი და `applyMenu()`
//
// ორჯერ გაშვება უსაფრთხოა — თუ უკვე დაპატჩილია, არაფერს აკეთებს.
//
// გაშვება:  node scripts/patch-data-hydration.mjs

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const FILE = "lib/data.ts";
const MARK = "// ── DB HYDRATION ──";

if (!existsSync(FILE)) {
  console.error(`ვერ ვიპოვე ${FILE} — გაუშვი repo-ს root-იდან.`);
  process.exit(1);
}

let src = readFileSync(FILE, "utf8");

if (src.includes(MARK)) {
  console.log("უკვე დაპატჩილია — არაფერი შევცვალე.");
  process.exit(0);
}

copyFileSync(FILE, FILE + ".bak");

// ── 1) const → let ──
const MUTABLE = [
  "PIZZAS",
  "TOPPINGS",
  "PIZZA_PHOTOS",
  "TOPPING_PHOTOS",
  "POPULAR",
  "MAX_TOPPINGS",
  "MIN_ORDER",
  "FREE_DELIVERY",
  "DELIVERY_FEE",
  "EXTRAS",
  "SAUCES",
  "DRINKS",
  "LOCATIONS",
  "COMBOS",
];

let changed = 0;
for (const name of MUTABLE) {
  const re = new RegExp(`export const (${name})\\b`);
  if (re.test(src)) {
    src = src.replace(re, "export let $1");
    changed++;
  } else {
    console.warn(`  ⚠ ვერ ვიპოვე: export const ${name}`);
  }
}

// ── 2) applyMenu ──
src += `

${MARK}
// ბაზიდან წამოღებული მენიუ ავსებს ზემოთა ცვლადებს.
// ES module live bindings-ის წყალობით ყველა კომპონენტი მაშინვე ხედავს ახალ მნიშვნელობებს —
// ამიტომ არცერთი კომპონენტის შეცვლა არ დაგვჭირდა.

export interface MenuPayload {
  PIZZAS: Pizza[];
  PIZZA_PHOTOS: Record<number, string>;
  TOPPINGS: Topping[];
  TOPPING_PHOTOS: Record<string, string>;
  POPULAR: string[];
  EXTRAS: Item[];
  SAUCES: Item[];
  DRINKS: Item[];
  LOCATIONS: Location[];
  COMBOS: Combo[];
  MAX_TOPPINGS: number;
  MIN_ORDER: number;
  FREE_DELIVERY: number;
  DELIVERY_FEE: number;
}

/** ცარიელ სიას ვიგნორებთ — უკეთესია ძველი მენიუ, ვიდრე ცარიელი გვერდი. */
export function applyMenu(m?: Partial<MenuPayload> | null) {
  if (!m) return;

  if (m.PIZZAS?.length) PIZZAS = m.PIZZAS;
  if (m.TOPPINGS?.length) TOPPINGS = m.TOPPINGS;
  if (m.PIZZA_PHOTOS && Object.keys(m.PIZZA_PHOTOS).length) PIZZA_PHOTOS = m.PIZZA_PHOTOS;
  if (m.TOPPING_PHOTOS && Object.keys(m.TOPPING_PHOTOS).length) TOPPING_PHOTOS = m.TOPPING_PHOTOS;
  if (m.POPULAR?.length) POPULAR = m.POPULAR;
  if (m.EXTRAS?.length) EXTRAS = m.EXTRAS;
  if (m.SAUCES?.length) SAUCES = m.SAUCES;
  if (m.DRINKS?.length) DRINKS = m.DRINKS;
  if (m.LOCATIONS?.length) LOCATIONS = m.LOCATIONS;
  if (m.COMBOS?.length) COMBOS = m.COMBOS;

  if (typeof m.MAX_TOPPINGS === "number") MAX_TOPPINGS = m.MAX_TOPPINGS;
  if (typeof m.MIN_ORDER === "number") MIN_ORDER = m.MIN_ORDER;
  if (typeof m.FREE_DELIVERY === "number") FREE_DELIVERY = m.FREE_DELIVERY;
  if (typeof m.DELIVERY_FEE === "number") DELIVERY_FEE = m.DELIVERY_FEE;
}
`;

writeFileSync(FILE, src);
console.log(`✓ ${changed}/${MUTABLE.length} ცვლადი გახდა \`let\``);
console.log(`✓ applyMenu() დაემატა`);
console.log(`  backup: ${FILE}.bak`);
