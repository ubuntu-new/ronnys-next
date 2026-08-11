import "server-only";
import { db } from "@/lib/db";
import type { PricedItem } from "@/lib/order-pricing";

/**
 * შეკვეთა → საწყობიდან ჩამოსაწერი რაოდენობები.
 *
 * წყარო `ConsumptionRule`-ია: პროდუქტის ბაზა (ცომი, სოუსი, ყუთი) და
 * ტოპინგების ხარჯი. წესის არარსებობა ნიშნავს, რომ ეს პოზიცია მარაგს არ ეხება —
 * ეს ნორმალურია და შეკვეთას არ აჩერებს.
 *
 * ⚠️ დაშვებები, რომლებიც უნდა იცოდე:
 *   • პიცის `config.toppings` უკვე შეიცავს ნაგულისხმევებსაც — ანუ ის აღწერს
 *     რეალურ პიცას. `removed`-ში ჩამოთვლილი ტოპინგი აკლდება.
 *   • ნახევრები ნახევრად ითვლება (zone left/right = 0.5).
 *   • კომბოში პიცა საშუალო ზომად ითვლება — იგივე, რაც ფასდადებაში.
 *   • ჯოხების „+მოცარელა" მოცარელას ტოპინგის M-ზომის წესს იყენებს.
 */

const SIZE_KEYS = ["S", "M", "XL"] as const;

export interface Consumption {
  itemId: string;
  qty: number;
}

interface Rule {
  itemId: string;
  qty: number;
  sizeKey: string | null;
}

interface Rules {
  byProduct: Map<string, Rule[]>;
  byTopping: Map<string, Rule[]>;
  toppingIdByName: Map<string, string>;
}

async function loadRules(): Promise<Rules> {
  const [rules, toppings] = await Promise.all([
    db.consumptionRule.findMany({
      select: { itemId: true, qty: true, sizeKey: true, productId: true, toppingId: true },
    }),
    db.topping.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
  ]);

  const byProduct = new Map<string, Rule[]>();
  const byTopping = new Map<string, Rule[]>();

  for (const r of rules) {
    const entry: Rule = { itemId: r.itemId, qty: Number(r.qty), sizeKey: r.sizeKey };
    if (r.productId) {
      const list = byProduct.get(r.productId) ?? [];
      list.push(entry);
      byProduct.set(r.productId, list);
    } else if (r.toppingId) {
      const list = byTopping.get(r.toppingId) ?? [];
      list.push(entry);
      byTopping.set(r.toppingId, list);
    }
  }

  // ტოპინგები config-ში ინგლისური სახელით ინახება
  const toppingIdByName = new Map<string, string>();
  for (const t of toppings) {
    const n = t.name as Record<string, unknown> | null;
    const en = n && typeof n === "object" ? String(n.en ?? "") : "";
    if (en) toppingIdByName.set(en, t.id);
  }

  return { byProduct, byTopping, toppingIdByName };
}

/** ზომაზე მორგებული წესები: კონკრეტული ზომა უპირატესია ზოგადზე. */
function pick(rules: Rule[] | undefined, sizeKey: string | null): Rule[] {
  if (!rules) return [];
  const exact = rules.filter((r) => r.sizeKey === sizeKey);
  const generic = rules.filter((r) => r.sizeKey === null);
  // ერთი და იმავე itemId-ზე კონკრეტული ზომა ჩრდილავს ზოგადს
  const taken = new Set(exact.map((r) => r.itemId));
  return [...exact, ...generic.filter((r) => !taken.has(r.itemId))];
}

function add(acc: Map<string, number>, itemId: string, qty: number) {
  if (!qty) return;
  acc.set(itemId, (acc.get(itemId) ?? 0) + qty);
}

type Cfg = Record<string, unknown>;

function sizeKeyOf(cfg: Cfg): string | null {
  const i = typeof cfg.sizeIdx === "number" ? cfg.sizeIdx : null;
  return i !== null && i >= 0 && i < SIZE_KEYS.length ? SIZE_KEYS[i] : null;
}

/** ტოპინგების ხარჯი — ზონები გათვალისწინებული, მოხსნილები გამოკლებული. */
function addToppings(acc: Map<string, number>, R: Rules, cfg: Cfg, size: string | null, factor: number) {
  const state = (cfg.toppings ?? {}) as Record<string, { whole?: number; left?: number; right?: number }>;
  const removed = (cfg.removed ?? {}) as Record<string, boolean>;

  for (const [name, z] of Object.entries(state)) {
    if (removed[name]) continue;
    const tid = R.toppingIdByName.get(name);
    if (!tid) continue;

    const units = (z.whole || 0) + 0.5 * (z.left || 0) + 0.5 * (z.right || 0);
    if (units <= 0) continue;

    for (const r of pick(R.byTopping.get(tid), size)) {
      add(acc, r.itemId, r.qty * units * factor);
    }
  }
}

/** კომბოს ref → პროდუქტის id (order-pricing-ის იგივე კოდირება). */
function refToProductId(ref: string): { id: string; size: string | null } | null {
  const [type, raw] = ref.split(":");
  if (!raw) return null;
  if (type === "pizza") return { id: `pizza-${raw}`, size: "M" }; // კომბოში საშუალო
  if (type === "drink") return { id: `drink-${raw}`, size: null };
  return { id: `side-${raw}`, size: null };
}

export async function computeConsumption(items: PricedItem[]): Promise<Consumption[]> {
  const R = await loadRules();
  const acc = new Map<string, number>();

  for (const it of items) {
    const cfg = (it.config ?? {}) as Cfg;
    const qty = it.qty;

    if (it.kind === "pizza") {
      const size = sizeKeyOf(cfg);
      for (const r of pick(R.byProduct.get(it.refId ?? ""), size)) add(acc, r.itemId, r.qty * qty);
      addToppings(acc, R, cfg, size, qty);
      continue;
    }

    if (it.kind === "half_and_half") {
      const size = sizeKeyOf(cfg);
      // ორივე პიცის ბაზა ნახევრად
      for (const key of ["leftId", "rightId"] as const) {
        const legacy = cfg[key];
        if (typeof legacy !== "number") continue;
        for (const r of pick(R.byProduct.get(`pizza-${legacy}`), size)) {
          add(acc, r.itemId, r.qty * 0.5 * qty);
        }
      }
      addToppings(acc, R, cfg, size, qty);
      continue;
    }

    if (it.kind === "combo") {
      const refs = Array.isArray(cfg.refs) ? (cfg.refs as string[]) : [];
      for (const ref of refs) {
        const target = refToProductId(ref);
        if (!target) continue;
        for (const r of pick(R.byProduct.get(target.id), target.size)) add(acc, r.itemId, r.qty * qty);
      }
      continue;
    }

    if (it.kind === "sticks") {
      const baseId = typeof cfg.baseId === "string" ? `side-${cfg.baseId}` : it.refId;
      if (baseId) for (const r of pick(R.byProduct.get(baseId), null)) add(acc, r.itemId, r.qty * qty);

      const dips = Array.isArray(cfg.dips) ? (cfg.dips as string[]) : [];
      for (const d of dips) {
        for (const r of pick(R.byProduct.get(`side-${d}`), null)) add(acc, r.itemId, r.qty * qty);
      }

      if (cfg.mozz === true) {
        const tid = R.toppingIdByName.get("Mozzarella");
        if (tid) for (const r of pick(R.byTopping.get(tid), "M")) add(acc, r.itemId, r.qty * qty);
      }
      if (cfg.icing === true) {
        for (const r of pick(R.byProduct.get("side-icing"), null)) add(acc, r.itemId, r.qty * qty);
      }
      continue;
    }

    // ჩვეულებრივი პროდუქტი — კოკა-კოლა 1 ცალი
    for (const r of pick(R.byProduct.get(it.refId ?? ""), null)) add(acc, r.itemId, r.qty * qty);
  }

  return [...acc.entries()]
    .map(([itemId, q]) => ({ itemId, qty: Math.round(q * 1000) / 1000 }))
    .filter((c) => c.qty > 0);
}

/** ფილიალის საწყობის ლოკაცია. */
export async function locationForBranch(branchId: string) {
  return db.stockLocation.findUnique({ where: { branchId }, select: { id: true } });
}
