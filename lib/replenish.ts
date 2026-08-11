import "server-only";
import { db } from "@/lib/db";

/**
 * შევსების წინადადებები.
 *
 * წესი: `ნაშთი ≤ მინიმუმი` → შესავსებია `სამიზნე − ნაშთი`.
 *
 * ⚠️ საწარმოს ნაშთიც მოწმდება. თუ ხუთივე ფილიალის მოთხოვნის ჯამი
 * საწყობის ნაშთს აღემატება, ეს **დამტკიცებამდე** ჩანს — და არა მაშინ,
 * როცა მანქანა უკვე გაგზავნილია.
 */

export interface Suggestion {
  itemId: string;
  itemName: unknown;
  unit: string;
  qty: number;
  min: number;
  target: number;
  need: number;
  /// რამდენია საწარმოში ამ წუთს
  atSource: number;
}

export interface BranchNeed {
  locationId: string;
  locationName: unknown;
  branchId: string | null;
  items: Suggestion[];
}

export async function suggestReplenishment(sourceLocationId?: string) {
  const warehouse = sourceLocationId
    ? await db.stockLocation.findUnique({ where: { id: sourceLocationId } })
    : await db.stockLocation.findFirst({ where: { type: "warehouse", deletedAt: null } });

  const [branchLocations, levels] = await Promise.all([
    db.stockLocation.findMany({
      where: { deletedAt: null, active: true, type: "branch" },
      orderBy: { createdAt: "asc" },
    }),
    db.stockLevel.findMany({ include: { item: true } }),
  ]);

  const sourceQty = new Map<string, number>();
  if (warehouse) {
    for (const l of levels) {
      if (l.locationId === warehouse.id) sourceQty.set(l.itemId, Number(l.qty));
    }
  }

  const needs: BranchNeed[] = [];

  for (const loc of branchLocations) {
    const items: Suggestion[] = [];

    for (const l of levels) {
      if (l.locationId !== loc.id) continue;
      if (l.minLevel == null || l.targetLevel == null) continue;
      if (l.item.deletedAt || !l.item.active) continue;

      const qty = Number(l.qty);
      const min = Number(l.minLevel);
      const target = Number(l.targetLevel);
      if (qty > min) continue;

      const need = Math.round((target - qty) * 1000) / 1000;
      if (need <= 0) continue;

      items.push({
        itemId: l.itemId,
        itemName: l.item.name,
        unit: l.item.unit,
        qty,
        min,
        target,
        need,
        atSource: sourceQty.get(l.itemId) ?? 0,
      });
    }

    if (items.length > 0) {
      needs.push({
        locationId: loc.id,
        locationName: loc.name,
        branchId: loc.branchId,
        items,
      });
    }
  }

  // საწარმოს საკუთარი ზღვრები — მას შევსება მიმწოდებლისგან სჭირდება
  const warehouseLow: Suggestion[] = [];
  if (warehouse) {
    for (const l of levels) {
      if (l.locationId !== warehouse.id) continue;
      if (l.minLevel == null) continue;
      if (l.item.deletedAt || !l.item.active) continue;

      const qty = Number(l.qty);
      const min = Number(l.minLevel);
      if (qty > min) continue;

      const target = l.targetLevel != null ? Number(l.targetLevel) : min;
      warehouseLow.push({
        itemId: l.itemId,
        itemName: l.item.name,
        unit: l.item.unit,
        qty,
        min,
        target,
        need: Math.max(0, Math.round((target - qty) * 1000) / 1000),
        atSource: qty,
      });
    }
  }

  // ჯამური მოთხოვნა თითო ერთეულზე — საწყობს ჰყოფნის თუ არა
  const demand = new Map<string, number>();
  for (const n of needs) {
    for (const i of n.items) demand.set(i.itemId, (demand.get(i.itemId) ?? 0) + i.need);
  }

  const shortages = [...demand.entries()]
    .map(([itemId, total]) => {
      const have = sourceQty.get(itemId) ?? 0;
      const any = needs.flatMap((n) => n.items).find((i) => i.itemId === itemId)!;
      return { itemId, name: any.itemName, unit: any.unit, total, have, gap: Math.round((total - have) * 1000) / 1000 };
    })
    .filter((x) => x.gap > 0);

  return { warehouse, needs, warehouseLow, shortages };
}
