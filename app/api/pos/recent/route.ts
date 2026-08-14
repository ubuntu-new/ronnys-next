import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPosSession } from "@/lib/pos-auth";
import { detailText } from "@/lib/item-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The last orders from THIS terminal.
 *
 * A cashier needs them constantly: the printer ran out of paper, a customer
 * asks what they were charged, a mistake needs voiding. Without this the
 * till is write-only and every correction goes through the office.
 */
export async function GET() {
  const session = await getPosSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orders = await db.order.findMany({
    where: { posId: session.posId, branchId: session.branchId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { items: true },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      no: o.orderNo,
      status: o.status,
      total: Number(o.total),
      at: o.createdAt,
      customer: o.customerName,
      items: o.items.map((i) => ({
        name: (i.name as Record<string, unknown>)?.en ?? "",
        qty: i.qty,
        detail: detailText(i.config),
        total: Number(i.lineTotal),
      })),
    })),
  });
}
