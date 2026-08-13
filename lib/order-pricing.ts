import "server-only";
import type { MenuPayload } from "@/lib/data";

/**
 * სერვერული ფასი.
 *
 * ⚠️ ეს ფაილი განზრახ იმეორებს `lib/pricing.ts`-ის ფორმულებს.
 * მიზეზი: იქაური ფუნქციები მოდულის გლობალებს (TOPPINGS/PIZZAS) კითხულობენ,
 * რომლებიც სერვერზე პარალელურ მოთხოვნებს შორის საერთოა. აქ ყველაფერი
 * პარამეტრად გადმოდის, ანუ რასის რისკი არ არსებობს.
 *
 * თუ `lib/pricing.ts` შეიცვალა — ესეც უნდა შეიცვალოს. მათი განსხვავება
 * პირდაპირ ნიშნავს, რომ კლიენტი ერთ ფასს დაინახავს, ჩეკზე სხვა დაიბეჭდება.
 */

const EXTRA_MOZZ_PRICE = 2.0; // TODO: settings-ში გადავიდეს (StickBuilder-შიც იგივეა)

export type Zone = "whole" | "left" | "right";
export type ZoneQty = { whole: number; left: number; right: number };
export type ToppingsState = Record<string, ZoneQty>;

export interface CartLineIn {
  kind: "pizza" | "hh" | "simple";
  qty: number;
  // pizza
  pizzaId?: number;
  sizeIdx?: number;
  crustIdx?: number;
  sauceIdx?: number;
  toppings?: ToppingsState;
  removed?: Record<string, boolean>;
  // hh
  leftId?: number;
  rightId?: number;
  // simple
  itemId?: string;
  name?: string;
  detail?: string;
}

export interface PricedItem {
  kind: "pizza" | "half_and_half" | "combo" | "sticks" | "product";
  refId: string | null; // menu-ს id (pizza-1, drink-cola…) — მოგვიანებით Product-ზე მიება
  name: string;
  config: Record<string, unknown>;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PricedOrder {
  items: PricedItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  errors: string[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function normDef(raw: unknown): ZoneQty {
  if (typeof raw === "number") return { whole: raw, left: 0, right: 0 };
  if (raw && typeof raw === "object") {
    const r = raw as Partial<ZoneQty>;
    return { whole: r.whole || 0, left: r.left || 0, right: r.right || 0 };
  }
  return { whole: 0, left: 0, right: 0 };
}

// ── პიცა ────────────────────────────────────────────────
function pizzaPrice(menu: MenuPayload, line: CartLineIn, errors: string[]) {
  const p = menu.PIZZAS.find((x) => x.id === line.pizzaId);
  if (!p) {
    errors.push(`პიცა ვერ მოიძებნა: ${line.pizzaId}`);
    return null;
  }

  const sizeIdx = Math.max(0, Math.min(2, line.sizeIdx ?? 1));
  const defaults = p.defaultExtras || {};
  const toppings = line.toppings || {};

  // დამატებული — მხოლოდ ნაგულისხმევზე ზემოთ; ნახევრები ნახევარ ფასად
  let extra = 0;
  for (const [name, e] of Object.entries(toppings)) {
    const t = menu.TOPPINGS.find((x) => x.name === name);
    if (!t) continue;
    const price = t.ps[sizeIdx];
    const d = normDef((defaults as Record<string, unknown>)[name]);
    extra += price * ((e.whole || 0) - d.whole);
    extra += price * 0.5 * ((e.left || 0) - d.left);
    extra += price * 0.5 * ((e.right || 0) - d.right);
  }

  // მოხსნის კრედიტი — მხოლოდ standard, მოცარელას გარდა
  let credit = 0;
  if (p.tier === "standard") {
    for (const name of Object.keys(line.removed || {})) {
      if (name === "Mozzarella") continue;
      const t = menu.TOPPINGS.find((x) => x.name === name);
      if (t) credit += t.ps[sizeIdx];
    }
  }

  return {
    unit: r2(p.sizes[sizeIdx] + extra - credit),
    name: p.name,
    refId: `pizza-${p.id}`,
    config: {
      sizeIdx,
      crustIdx: line.crustIdx ?? 0,
      sauceIdx: line.sauceIdx ?? 2,
      toppings,
      removed: line.removed ?? {},
      // რეცეპტის ასლი — ჩანაწერი უცვლელი უნდა დარჩეს, თუნდაც რეცეპტი შეიცვალოს
      ingredients: p.ings ?? [],
    },
  };
}

// ── ნახევარ-ნახევარი ────────────────────────────────────
function hhPrice(menu: MenuPayload, line: CartLineIn, errors: string[]) {
  const L = menu.PIZZAS.find((x) => x.id === line.leftId);
  const R = menu.PIZZAS.find((x) => x.id === line.rightId);
  if (!L || !R) {
    errors.push(`ნახევარ-ნახევრის პიცა ვერ მოიძებნა: ${line.leftId}/${line.rightId}`);
    return null;
  }

  const sizeIdx = Math.max(0, Math.min(2, line.sizeIdx ?? 1));
  const base = L.sizes[sizeIdx] / 2 + R.sizes[sizeIdx] / 2;

  // H&H-ს ნაგულისხმევები არ აქვს — ყველა ტოპინგი ფასიანია
  let extra = 0;
  for (const [name, z] of Object.entries(line.toppings || {})) {
    const t = menu.TOPPINGS.find((x) => x.name === name);
    if (!t) continue;
    const price = t.ps[sizeIdx];
    extra += price * (z.whole || 0) + price * 0.5 * (z.left || 0) + price * 0.5 * (z.right || 0);
  }

  return {
    unit: r2(base + extra),
    name: `${L.name} / ${R.name}`,
    refId: null,
    config: {
      leftId: L.id,
      rightId: R.id,
      sizeIdx,
      crustIdx: line.crustIdx ?? 0,
      sauceIdx: line.sauceIdx ?? 2,
      toppings: line.toppings ?? {},
      leftIngredients: L.ings ?? [],
      rightIngredients: R.ings ?? [],
    },
  };
}

// ── ref → ფასი (კომბოსთვის) ─────────────────────────────
function refPrice(menu: MenuPayload, ref: string): { name: string; price: number } | null {
  const [type, id] = ref.split(":");
  if (type === "pizza") {
    const p = menu.PIZZAS.find((x) => x.id === Number(id));
    return p ? { name: p.name, price: p.sizes[1] } : null; // კომბოში საშუალო ზომა
  }
  for (const arr of [menu.DRINKS, menu.EXTRAS, menu.SAUCES]) {
    const it = arr.find((x) => x.id === id);
    if (it) return { name: it.name, price: it.price };
  }
  return null;
}

// ── მარტივი: კომბო | ჯოხები | ჩვეულებრივი ───────────────
function simplePrice(menu: MenuPayload, line: CartLineIn, errors: string[]) {
  const raw = line.itemId ?? "";

  // combo:<id>|ref,ref,ref
  if (raw.startsWith("combo:")) {
    const [head, tail = ""] = raw.split("|");
    const comboId = head.slice("combo:".length);
    const combo = menu.COMBOS.find((c) => c.id === comboId);
    if (!combo) {
      errors.push(`კომბო ვერ მოიძებნა: ${comboId}`);
      return null;
    }

    const refs = tail ? tail.split(",").filter(Boolean) : [];
    let base = 0;
    const chosen: string[] = [];
    for (const ref of refs) {
      const r = refPrice(menu, ref);
      if (!r) {
        errors.push(`კომბოს პოზიცია ვერ მოიძებნა: ${ref}`);
        return null;
      }
      base += r.price;
      chosen.push(r.name);
    }

    let unit = base;
    if (combo.pricing.mode === "fixed") unit = combo.pricing.price ?? base;
    else if (combo.pricing.mode === "discount") unit = base * (1 - (combo.pricing.percent ?? 0) / 100);

    return {
      unit: r2(unit),
      name: combo.name,
      refId: null,
      config: { comboId, refs, chosen },
    };
  }

  // <itemId>|dips+mozz+icing
  if (raw.includes("|")) {
    const [baseId, rest = ""] = raw.split("|");
    const item = [...menu.EXTRAS, ...menu.SAUCES, ...menu.DRINKS].find((x) => x.id === baseId);
    if (!item) {
      errors.push(`პროდუქტი ვერ მოიძებნა: ${baseId}`);
      return null;
    }

    const mozz = rest.includes("+mozz");
    const icing = rest.includes("+icing");
    const dipPart = rest.replace("+mozz", "").replace("+icing", "");
    const dips = dipPart ? dipPart.split(",").filter(Boolean) : [];

    let unit = item.price;
    for (const d of dips) {
      const sauce = menu.SAUCES.find((x) => x.id === d);
      if (sauce) unit += sauce.price;
    }
    if (mozz) unit += EXTRA_MOZZ_PRICE;
    if (icing) unit += menu.SAUCES.find((x) => x.id === "icing")?.price ?? 1.8;

    return {
      unit: r2(unit),
      name: item.name,
      refId: `side-${baseId}`,
      config: { baseId, dips, mozz, icing },
    };
  }

  // ჩვეულებრივი
  const item = [...menu.EXTRAS, ...menu.SAUCES, ...menu.DRINKS].find((x) => x.id === raw);
  if (!item) {
    errors.push(`პროდუქტი ვერ მოიძებნა: ${raw}`);
    return null;
  }
  const isDrink = menu.DRINKS.some((x) => x.id === raw);
  return {
    unit: r2(item.price),
    name: item.name,
    refId: `${isDrink ? "drink" : "side"}-${raw}`,
    config: {},
  };
}

// ── მთავარი ─────────────────────────────────────────────
export function priceOrder(
  menu: MenuPayload,
  lines: CartLineIn[],
  fulfillment: "delivery" | "pickup",
): PricedOrder {
  const errors: string[] = [];
  const items: PricedItem[] = [];

  for (const line of lines) {
    const qty = Math.max(1, Math.floor(line.qty || 1));
    let out: { unit: number; name: string; refId: string | null; config: Record<string, unknown> } | null = null;
    let kind: PricedItem["kind"] = "product";

    if (line.kind === "pizza") {
      out = pizzaPrice(menu, line, errors);
      kind = "pizza";
    } else if (line.kind === "hh") {
      out = hhPrice(menu, line, errors);
      kind = "half_and_half";
    } else {
      out = simplePrice(menu, line, errors);
      const raw = line.itemId ?? "";
      kind = raw.startsWith("combo:") ? "combo" : raw.includes("|") ? "sticks" : "product";
    }

    if (!out) continue;

    items.push({
      kind,
      refId: out.refId,
      name: out.name,
      config: out.config,
      qty,
      unitPrice: out.unit,
      lineTotal: r2(out.unit * qty),
    });
  }

  const subtotal = r2(items.reduce((s, i) => s + i.lineTotal, 0));
  const deliveryFee =
    fulfillment === "delivery" && subtotal < menu.FREE_DELIVERY ? menu.DELIVERY_FEE : 0;

  return { items, subtotal, deliveryFee, total: r2(subtotal + deliveryFee), errors };
}
