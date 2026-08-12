import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * თვითღირებულება — მოძრავი საშუალო.
 *
 * მიღებისას:
 *   ახალი საშუალო = (ძველი ნაშთი × ძველი საშუალო + შემოსული × ფასი)
 *                   ÷ (ძველი ნაშთი + შემოსული)
 *
 * გასვლისას (გაყიდვა, ჩამოწერა, გადატანა) საშუალო **არ იცვლება** — მხოლოდ
 * მოძრაობას ეწერება მიმდინარე საშუალო, რომ ისტორიაში დარჩეს.
 *
 * ⚠️ რატომ საშუალო და არა FIFO: FIFO პარტიების თვალყურის დევნებას მოითხოვს —
 * რომელი კილო რომელი მიღებიდანაა. ერთ ყუთში შერეული მოცარელისთვის ეს ფიქციაა.
 */

const D = (v: number) => new Prisma.Decimal(v);

/** მიღების ფასის ჩაწერა და საშუალოს გადათვლა. */
export async function applyReceiptCost(
  locationId: string,
  itemId: string,
  qty: number,
  unitCost: number,
  movementId: string,
) {
  return db.$transaction(async (tx) => {
    const level = await tx.stockLevel.findUnique({
      where: { locationId_itemId: { locationId, itemId } },
      select: { id: true, qty: true, avgCost: true },
    });
    if (!level) return null;

    // ნაშთი უკვე გაზრდილია მოძრაობით — ძველს უკან ვიანგარიშებთ
    const after = Number(level.qty);
    const before = after - qty;
    const oldAvg = level.avgCost != null ? Number(level.avgCost) : 0;

    let newAvg: number;
    if (before <= 0) {
      // ცარიელი ან მინუსი — ახალი ფასი პირდაპირ ხდება საშუალო
      newAvg = unitCost;
    } else {
      newAvg = (before * oldAvg + qty * unitCost) / after;
    }
    newAvg = Math.round(newAvg * 10000) / 10000;

    await tx.stockLevel.update({ where: { id: level.id }, data: { avgCost: D(newAvg) } });

    await tx.stockMovement.update({
      where: { id: movementId },
      data: { unitCost: D(unitCost), totalCost: D(Math.round(qty * unitCost * 100) / 100) },
    });

    return newAvg;
  });
}

/** გასვლის ღირებულება — მიმდინარე საშუალოთი. საშუალო არ იცვლება. */
export async function applyOutgoingCost(locationId: string, itemId: string, qty: number, movementId: string) {
  const level = await db.stockLevel.findUnique({
    where: { locationId_itemId: { locationId, itemId } },
    select: { avgCost: true },
  });
  if (!level?.avgCost) return null;

  const cost = Number(level.avgCost);
  await db.stockMovement.update({
    where: { id: movementId },
    data: { unitCost: level.avgCost, totalCost: D(Math.round(qty * cost * 100) / 100) },
  });
  return cost;
}

// ─────────────────────────────────────────────
// მენიუს თვითღირებულება
// ─────────────────────────────────────────────

export interface ProductCost {
  productId: string | null;
  toppingId: string | null;
  name: unknown;
  sizeKey: string | null;
  /// ინგრედიენტების ჯამური ღირებულება
  cost: number;
  /// გასაყიდი ფასი (პროდუქტზე; ტოპინგზე — დანამატის ფასი)
  price: number | null;
  /// მოგება ₾
  margin: number | null;
  /// მოგება %
  marginPct: number | null;
  /// რამდენ ინგრედიენტს აკლია ფასი
  missing: number;
  lines: { name: unknown; qty: number; unit: string; avgCost: number | null; total: number | null }[];
}

/**
 * ხარჯვის წესები + საშუალო ღირებულებები → პროდუქტის თვითღირებულება.
 *
 * ღირებულება საწარმოს ლოკაციიდან მოდის — ის ცენტრალური მიღების წერტილია.
 */
export async function computeMenuCosts(): Promise<{ products: ProductCost[]; toppings: ProductCost[] }> {
  const [warehouse, rules, levels] = await Promise.all([
    db.stockLocation.findFirst({ where: { type: "warehouse", deletedAt: null }, select: { id: true } }),
    db.consumptionRule.findMany({
      include: {
        item: { select: { id: true, name: true, unit: true } },
        product: { select: { id: true, name: true, price: true, sizes: true } },
        topping: { select: { id: true, name: true, prices: true } },
      },
    }),
    db.stockLevel.findMany({ select: { locationId: true, itemId: true, avgCost: true } }),
  ]);

  const costOf = new Map<string, number>();
  if (warehouse) {
    for (const l of levels) {
      if (l.locationId === warehouse.id && l.avgCost != null) costOf.set(l.itemId, Number(l.avgCost));
    }
  }

  // ჯგუფდება მფლობელისა და ზომის მიხედვით
  const groups = new Map<string, typeof rules>();
  for (const r of rules) {
    const key = `${r.productId ?? ""}|${r.toppingId ?? ""}|${r.sizeKey ?? ""}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const products: ProductCost[] = [];
  const toppings: ProductCost[] = [];

  for (const [, list] of groups) {
    const first = list[0];
    let cost = 0;
    let missing = 0;

    const lines = list.map((r) => {
      const avg = costOf.get(r.itemId) ?? null;
      const qty = Number(r.qty);
      const total = avg != null ? Math.round(qty * avg * 100) / 100 : null;
      if (avg == null) missing++;
      else cost += qty * avg;
      return { name: r.item.name, qty, unit: r.item.unit, avgCost: avg, total };
    });

    cost = Math.round(cost * 100) / 100;

    // გასაყიდი ფასი
    let price: number | null = null;
    if (first.product) {
      if (first.sizeKey) {
        const sz = first.product.sizes.find((s) => s.key === first.sizeKey);
        price = sz ? Number(sz.price) : null;
      } else {
        price = first.product.price != null ? Number(first.product.price) : null;
      }
    } else if (first.topping) {
      const key = first.sizeKey ?? "M";
      const tp = first.topping.prices.find((p) => p.sizeKey === key);
      price = tp ? Number(tp.price) : null;
    }

    const margin = price != null && missing === 0 ? Math.round((price - cost) * 100) / 100 : null;
    const marginPct = margin != null && price ? Math.round((margin / price) * 1000) / 10 : null;

    const entry: ProductCost = {
      productId: first.productId,
      toppingId: first.toppingId,
      name: first.product?.name ?? first.topping?.name ?? {},
      sizeKey: first.sizeKey,
      cost,
      price,
      margin,
      marginPct,
      missing,
      lines,
    };

    if (first.productId) products.push(entry);
    else toppings.push(entry);
  }

  return { products, toppings };
}

/** მარაგის ჯამური ღირებულება ლოკაციებზე. */
export async function stockValue() {
  const [locations, levels] = await Promise.all([
    db.stockLocation.findMany({ where: { deletedAt: null }, orderBy: { type: "asc" } }),
    db.stockLevel.findMany({ include: { item: { select: { name: true, unit: true, active: true } } } }),
  ]);

  return locations.map((loc) => {
    const rows = levels.filter((l) => l.locationId === loc.id && l.item.active);
    let value = 0;
    let unpriced = 0;

    for (const l of rows) {
      if (l.avgCost == null) {
        if (Number(l.qty) > 0) unpriced++;
        continue;
      }
      value += Number(l.qty) * Number(l.avgCost);
    }

    return {
      location: loc,
      value: Math.round(value * 100) / 100,
      items: rows.length,
      unpriced,
    };
  });
}
