"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, getSession } from "@/lib/admin-auth";
import { recordMovements } from "@/lib/stock";

const FLOW = ["new", "confirmed", "preparing", "ready", "delivering", "completed", "cancelled"] as const;
type Status = (typeof FLOW)[number];

export async function setOrderStatus(id: string, status: string) {
  // გაუქმება ცალკე უფლებაა — შემთხვევით დაჭერა ძვირი ჯდება
  const perm = status === "cancelled" ? "can_void" : "can_view_reports";
  await requirePermission(perm);
  const session = await getSession();

  if (!(FLOW as readonly string[]).includes(status)) throw new Error("უცნობი სტატუსი");

  const order = await db.order.findUnique({ where: { id }, select: { statusHistory: true, status: true } });
  if (!order) throw new Error("შეკვეთა ვერ მოიძებნა");
  if (order.status === "completed" || order.status === "cancelled") {
    throw new Error("დასრულებული ან გაუქმებული შეკვეთის სტატუსი აღარ იცვლება");
  }

  const history = Array.isArray(order.statusHistory) ? (order.statusHistory as unknown[]) : [];

  await db.order.update({
    where: { id },
    data: {
      status: status as Status,
      statusHistory: [
        ...history,
        { status, at: new Date().toISOString(), by: session?.name ?? session?.sub ?? "admin" },
      ] as object,
      ...(status === "completed" ? { deliveredAt: new Date() } : {}),
    },
  });

  // გაუქმებისას ჩამოწერილი მარაგი ბრუნდება — უკუ-მოძრაობით, არა წაშლით
  if (status === "cancelled") {
    const moves = await db.stockMovement.findMany({
      where: { refType: "Order", refId: id, type: "sale" },
      select: { locationId: true, itemId: true, qty: true },
    });
    if (moves.length > 0) {
      await recordMovements(
        moves.map((m) => ({
          locationId: m.locationId,
          itemId: m.itemId,
          type: "count_adjust" as const,
          qty: Number(m.qty) * -1,
          refType: "Order",
          refId: id,
          note: "შეკვეთის გაუქმება — მარაგი დაბრუნდა",
          employeeId: session?.sub ?? null,
        })),
      );
    }
  }

  await db.auditLog.create({
    data: {
      action: `order.${status}`,
      entityType: "Order",
      entityId: id,
      employeeId: session?.sub,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}
