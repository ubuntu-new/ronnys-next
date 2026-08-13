/**
 * One shared formatter for order-item contents.
 *
 * Used by the order detail page, the kitchen display, the checkout review —
 * anywhere a "what's in this" list appears. Deliberately a PURE module: no
 * "server-only", no db import, so the server pages and the client-side KDS
 * render an item identically. Two formatters would drift, and a kitchen
 * reading something different from the receipt is a real problem.
 */

const SIZES = ["S", "M", "XL"];

/** Matches CRUST_KEYS / SAUCE_KEYS order in lib/pricing.ts. */
const CRUST = ["Original crust", "Thin crust"];
const SAUCE = ["No sauce", "Light sauce", "Regular sauce", "Extra sauce"];

export interface DetailLine {
  kind: "size" | "crust" | "sauce" | "base" | "added" | "removed" | "combo" | "extra";
  text: string;
}

type Cfg = Record<string, unknown>;

/**
 * @param config  OrderItem.config snapshot, or a cart line (same field names)
 * @param fallbackIngredients  the product's CURRENT recipe, used only for
 *        older orders saved before ingredients were snapshotted
 */
export function detailLines(config: unknown, fallbackIngredients?: string[]): DetailLine[] {
  const c = (config ?? {}) as Cfg;
  const out: DetailLine[] = [];

  const isPizza =
    typeof c.sizeIdx === "number" || typeof c.crustIdx === "number" || typeof c.sauceIdx === "number";

  // ── size ──
  if (typeof c.sizeIdx === "number" && SIZES[c.sizeIdx]) {
    out.push({ kind: "size", text: SIZES[c.sizeIdx] });
  }

  // ── crust and sauce ──
  // Shown ALWAYS, not only when they differ from the default: a cook should
  // never have to guess whether "nothing written" means regular or missing.
  if (isPizza) {
    const ci = typeof c.crustIdx === "number" ? c.crustIdx : 0;
    const si = typeof c.sauceIdx === "number" ? c.sauceIdx : 2;
    if (CRUST[ci]) out.push({ kind: "crust", text: CRUST[ci] });
    if (SAUCE[si]) out.push({ kind: "sauce", text: SAUCE[si] });
  }

  const removed = (c.removed ?? {}) as Record<string, boolean>;
  const removedNames = Object.keys(removed).filter((n) => removed[n]);

  // ── base recipe ──
  // Prefer the snapshot: if the recipe changes tomorrow, an old order must
  // still show what was actually made.
  const snapshot = Array.isArray(c.ingredients) ? (c.ingredients as string[]) : null;
  const base = snapshot ?? fallbackIngredients ?? [];

  for (const name of base) {
    if (removedNames.includes(name)) continue;
    out.push({ kind: "base", text: name });
  }

  for (const name of removedNames) {
    out.push({ kind: "removed", text: name });
  }

  // ── added by the customer ──
  const tops = (c.toppings ?? {}) as Record<string, { whole?: number; left?: number; right?: number }>;
  for (const [name, z] of Object.entries(tops)) {
    const w = z.whole || 0;
    const l = z.left || 0;
    const r = z.right || 0;
    if (w > 0) out.push({ kind: "added", text: w > 1 ? `${name} ×${w}` : name });
    if (l > 0) out.push({ kind: "added", text: `${name} (L)` });
    if (r > 0) out.push({ kind: "added", text: `${name} (R)` });
  }

  // ── half & half ──
  if (Array.isArray(c.leftIngredients) || Array.isArray(c.rightIngredients)) {
    const L = (c.leftIngredients ?? []) as string[];
    const R = (c.rightIngredients ?? []) as string[];
    if (L.length) out.push({ kind: "base", text: `L: ${L.join(", ")}` });
    if (R.length) out.push({ kind: "base", text: `R: ${R.join(", ")}` });
  }

  // ── combo contents ──
  if (Array.isArray(c.chosen) && c.chosen.length) {
    for (const name of c.chosen as string[]) out.push({ kind: "combo", text: name });
  }

  // ── sticks add-ons ──
  if (Array.isArray(c.dips) && c.dips.length) {
    out.push({ kind: "extra", text: `dips: ${(c.dips as string[]).join(", ")}` });
  }
  if (c.mozz === true) out.push({ kind: "added", text: "extra mozzarella" });
  if (c.icing === true) out.push({ kind: "added", text: "icing" });

  return out;
}

/** Compact one-line version, for tight spaces. */
export function detailText(config: unknown, fallbackIngredients?: string[]): string {
  return detailLines(config, fallbackIngredients)
    .map((l) => (l.kind === "removed" ? `− ${l.text}` : l.kind === "added" ? `+ ${l.text}` : l.text))
    .join(" · ");
}

/** Colour hint shared by every surface, so nothing looks different anywhere. */
export function lineColor(kind: DetailLine["kind"]): string | undefined {
  if (kind === "removed") return "var(--a-danger)";
  if (kind === "added") return "var(--a-orange)";
  if (kind === "crust" || kind === "sauce") return "var(--a-ink)";
  return undefined;
}
