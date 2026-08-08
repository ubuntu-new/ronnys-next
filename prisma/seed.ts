// prisma/seed.ts
// მენიუს seed — წყარო: lib/data.ts (არაფერი ხელახლა აკრეფილი).
// იდემპოტენტურია: ყველა ჩანაწერს დეტერმინისტული id აქვს და upsert-ით იწერება,
// ასე რომ ხელახლა გაშვება უსაფრთხოა — არ დუბლირდება, უბრალოდ განაახლებს.
//
// გაშვება:  npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import {
  PIZZAS,
  TOPPINGS,
  PIZZA_PHOTOS,
  TOPPING_PHOTOS,
  EXTRAS,
  SAUCES,
  DRINKS,
  LOCATIONS,
  COMBOS,
  MAX_TOPPINGS,
  MIN_ORDER,
  FREE_DELIVERY,
  DELIVERY_FEE,
} from "../lib/data";

const db = new PrismaClient();

const ORG_ID = "ronnys";
const SIZE_KEYS = ["S", "M", "XL"] as const;
const SIZE_CM = [20, 30, 45];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const toppingId = (name: string) => `top-${slug(name)}`;
// "pizza:1" → "pizza-1" | "drink:cola" → "drink-cola" | "side:sticks" → "side-sticks"
const refToId = (ref: string) => ref.replace(":", "-");

const i18n = (en: string, ka?: string | null) => ({ en, ka: ka || en });

async function main() {
  // ── 1) ორგანიზაცია ──────────────────────────────────────────
  await db.organization.upsert({
    where: { id: ORG_ID },
    update: { name: i18n("Ronny's Pizza"), active: true },
    create: { id: ORG_ID, name: i18n("Ronny's Pizza"), active: true },
  });
  console.log("✓ organization");

  // ── 2) ბრანჩები + POS ტერმინალები ───────────────────────────
  for (const [i, loc] of LOCATIONS.entries()) {
    const branchId = `br-${loc.id}`;
    const code = `TBS-0${i + 1}`;
    const data = {
      orgId: ORG_ID,
      code,
      name: i18n(loc.branch, loc.branch_ka),
      address: i18n(loc.address, loc.address_ka),
      phone: loc.phone,
      hours: { display: i18n(loc.hours) },
      active: true,
      sortOrder: i,
    };
    await db.branch.upsert({ where: { id: branchId }, update: data, create: { id: branchId, ...data } });

    for (const n of [1, 2]) {
      const posId = `${code}-POS-${n}`;
      const t = { branchId, posId, label: i18n(`POS ${n}`), active: true, hasCardTerminal: true };
      await db.terminal.upsert({ where: { posId }, update: t, create: t });
    }
  }
  console.log(`✓ ${LOCATIONS.length} branches (2 POS each)`);

  // ── 3) settings — key/value ─────────────────────────────────
  const settings: Record<string, unknown> = {
    order: {
      minOrder: MIN_ORDER,
      deliveryFee: DELIVERY_FEE,
      freeDeliveryThreshold: FREE_DELIVERY,
      maxToppings: MAX_TOPPINGS,
      currency: "GEL",
    },
    loyalty: { enabled: true, pointsPerGel: 1, redeemRate: 0.1, minRedeem: 100 },
    employeeDiscount: { enabled: true, value: 30, mode: "percent", appliesEverywhere: true },
    discountRules: { stackable: false, excludeCombos: true, excludePromoProducts: true },
    discountVerification: { mode: "manual" },
    tax: { rate: 0, inclusive: true },
    social: [
      { id: "facebook", label: "Facebook", href: "", enabled: true },
      { id: "instagram", label: "Instagram", href: "", enabled: true },
      { id: "tiktok", label: "TikTok", href: "", enabled: true },
      { id: "x", label: "X", href: "", enabled: false },
    ],
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({
      where: { key },
      update: { value: value as object, updatedBy: "seed" },
      create: { key, value: value as object, updatedBy: "seed" },
    });
  }
  console.log(`✓ ${Object.keys(settings).length} settings`);

  // ── 4) კატეგორიები ──────────────────────────────────────────
  const categories = [
    { id: "cat-pizza", name: i18n("Pizza", "პიცა"), icon: "🍕", sortOrder: 1 },
    { id: "cat-sides", name: i18n("Sides", "დამატებები"), icon: "🥖", sortOrder: 2 },
    { id: "cat-sauces", name: i18n("Sauces", "სოუსები"), icon: "🥫", sortOrder: 3 },
    { id: "cat-drinks", name: i18n("Drinks", "სასმელი"), icon: "🥤", sortOrder: 4 },
  ];
  for (const c of categories) {
    const { id, ...rest } = c;
    await db.category.upsert({
      where: { id },
      update: { ...rest, type: "food", active: true },
      create: { id, ...rest, type: "food", active: true },
    });
  }
  console.log(`✓ ${categories.length} categories`);

  // ── 5) ტოპინგები + ფასები ზომებზე ───────────────────────────
  for (const [i, t] of TOPPINGS.entries()) {
    const id = toppingId(t.name);
    const data = {
      name: i18n(t.name, t.name_ka),
      category: t.dots?.[0] ?? null,
      photo: TOPPING_PHOTOS[t.name] ?? null,
      recipeOnly: !!t.recipeOnly,
      active: true,
      sortOrder: i,
    };
    await db.topping.upsert({ where: { id }, update: data, create: { id, ...data } });

    for (const [si, key] of SIZE_KEYS.entries()) {
      await db.toppingPrice.upsert({
        where: { toppingId_sizeKey: { toppingId: id, sizeKey: key } },
        update: { price: t.ps[si] },
        create: { toppingId: id, sizeKey: key, price: t.ps[si] },
      });
    }
  }
  console.log(`✓ ${TOPPINGS.length} toppings (× 3 sizes)`);

  // ── 6) პიცები — ზომები + ნაგულისხმევი ინგრედიენტები ─────────
  for (const p of PIZZAS) {
    const id = `pizza-${p.id}`;
    const data = {
      name: i18n(p.name, p.name_ka),
      description: i18n(p.tagline, p.tagline_ka),
      categoryId: "cat-pizza",
      type: "pizza" as const,
      photo: PIZZA_PHOTOS[p.id] ?? null,
      price: null,
      tier: p.tier,
      badge: p.badge ? i18n(p.badge, p.badge_ka) : undefined,
      discountable: true,
      active: true,
      sortOrder: p.id,
    };
    await db.product.upsert({ where: { id }, update: data, create: { id, ...data } });

    for (const [si, key] of SIZE_KEYS.entries()) {
      await db.productSize.upsert({
        where: { productId_key: { productId: id, key } },
        update: { cm: SIZE_CM[si], price: p.sizes[si], sortOrder: si },
        create: { productId: id, key, cm: SIZE_CM[si], price: p.sizes[si], sortOrder: si },
      });
    }

    for (const [ii, ing] of (p.ings ?? []).entries()) {
      const tid = toppingId(ing);
      const exists = await db.topping.findUnique({ where: { id: tid } });
      if (!exists) {
        console.warn(`  ⚠ ტოპინგი ვერ მოიძებნა: "${ing}" (${p.name})`);
        continue;
      }
      await db.productTopping.upsert({
        where: { productId_toppingId: { productId: id, toppingId: tid } },
        update: { sortOrder: ii },
        create: { productId: id, toppingId: tid, sortOrder: ii },
      });
    }
  }
  console.log(`✓ ${PIZZAS.length} pizzas`);

  // ── 7) მარტივი პროდუქტები: sides / sauces / drinks ──────────
  const simple = [
    { list: EXTRAS, prefix: "side", categoryId: "cat-sides", type: "sticks" as const },
    { list: SAUCES, prefix: "side", categoryId: "cat-sauces", type: "item" as const },
    { list: DRINKS, prefix: "drink", categoryId: "cat-drinks", type: "drink" as const },
  ];
  let simpleCount = 0;
  for (const group of simple) {
    for (const [i, it] of group.list.entries()) {
      const id = `${group.prefix}-${it.id}`;
      const data = {
        name: i18n(it.name, it.name_ka),
        description: i18n(it.desc, it.desc_ka),
        categoryId: group.categoryId,
        type: group.type,
        photo: it.photo ?? null,
        price: it.price,
        discountable: true,
        active: true,
        sortOrder: i,
      };
      await db.product.upsert({ where: { id }, update: data, create: { id, ...data } });
      simpleCount++;
    }
  }
  console.log(`✓ ${simpleCount} sides / sauces / drinks`);

  // ── 8) კომბოები ─────────────────────────────────────────────
  for (const [ci, c] of COMBOS.entries()) {
    const data = {
      name: i18n(c.name, c.name_ka),
      description: i18n(c.desc, c.desc_ka),
      photo: c.photo ?? null,
      badge: c.badge ? i18n(c.badge, c.badge_ka) : undefined,
      pricingMode: c.pricing.mode,
      price: c.pricing.price ?? null,
      percent: c.pricing.percent ?? null,
      discountable: false,
      active: c.active !== false,
      sortOrder: ci,
    };
    await db.combo.upsert({ where: { id: c.id }, update: data, create: { id: c.id, ...data } });

    for (const [si, s] of c.slots.entries()) {
      const slotId = `${c.id}-slot-${si}`;
      const sd = { comboId: c.id, label: i18n(s.label, s.label_ka), mode: s.mode, sortOrder: si };
      await db.comboSlot.upsert({ where: { id: slotId }, update: sd, create: { id: slotId, ...sd } });

      for (const ref of s.options) {
        const productId = refToId(ref);
        const exists = await db.product.findUnique({ where: { id: productId } });
        if (!exists) {
          console.warn(`  ⚠ combo ref ვერ მოიძებნა: "${ref}" (${c.name})`);
          continue;
        }
        await db.comboSlotOption.upsert({
          where: { slotId_productId: { slotId, productId } },
          update: {},
          create: { slotId, productId },
        });
      }
    }
  }
  console.log(`✓ ${COMBOS.length} combos`);

  // ── 9) შეჯამება ─────────────────────────────────────────────
  const [branches, cats, prods, tops, combos, sets] = await Promise.all([
    db.branch.count(),
    db.category.count(),
    db.product.count(),
    db.topping.count(),
    db.combo.count(),
    db.setting.count(),
  ]);
  console.log("\n─────────── შედეგი ───────────");
  console.log(`branches   ${branches}`);
  console.log(`categories ${cats}`);
  console.log(`products   ${prods}`);
  console.log(`toppings   ${tops}`);
  console.log(`combos     ${combos}`);
  console.log(`settings   ${sets}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
