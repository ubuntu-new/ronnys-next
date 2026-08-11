import "server-only";
import { db } from "@/lib/db";
import { getSession } from "@/lib/admin-auth";

/**
 * აუდიტის ჩანაწერი.
 *
 * წესები, რომლებსაც ვიცავთ:
 *   • ჩანაწერი მხოლოდ ემატება — არასდროს იშლება და არ იცვლება
 *   • ყოველ მოქმედებას ჰყავს ავტორი (`employeeId`)
 *   • სადაც ცვლილებაა, ვინახავთ **ძველსაც და ახალსაც** — რომ ჩანდეს რა შეიცვალა
 *   • ჩავარდნა მთავარ ოპერაციას არ აჩერებს (ლოგი მეორეხარისხოვანია)
 */

export interface LogInput {
  action: string; // "product.update" | "transfer.sent" | ...
  entityType: string;
  entityId?: string | null;
  branchId?: string | null;
  before?: unknown;
  after?: unknown;
  employeeId?: string | null;
}

export async function logAction(input: LogInput) {
  try {
    const session = input.employeeId ? null : await getSession();

    await db.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        branchId: input.branchId ?? null,
        before: (input.before ?? undefined) as object | undefined,
        after: (input.after ?? undefined) as object | undefined,
        employeeId: input.employeeId ?? session?.sub ?? null,
      },
    });
  } catch (e) {
    console.error("audit: ჩაწერა ვერ მოხერხდა", input.action, e);
  }
}

/**
 * ორ ობიექტს ადარებს და მხოლოდ **შეცვლილ** ველებს აბრუნებს.
 * მთელი ობიექტის შენახვა ჟურნალს კითხვადობას უკარგავს — 40 ველიდან
 * ერთის შეცვლა 40-ველიან ჩანაწერს ქმნის.
 */
export function diff<T extends Record<string, unknown>>(
  before: T | null | undefined,
  after: T | null | undefined,
): { before: Record<string, unknown>; after: Record<string, unknown> } | null {
  if (!before || !after) return null;

  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (k === "updatedAt" || k === "createdAt") continue;
    const x = before[k];
    const y = after[k];
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    b[k] = x ?? null;
    a[k] = y ?? null;
  }

  return Object.keys(a).length > 0 ? { before: b, after: a } : null;
}
