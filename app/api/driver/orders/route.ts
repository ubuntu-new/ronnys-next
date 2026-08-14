import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDriverSession } from "@/lib/driver-auth";
import { logAction } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — the orders assigned to me and not yet delivered. */
export async function GET() {
  const session = await getDriverSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orders = await db.order.findMany({
    where: { driverId: session.sub, status: { in: ["ready", "delivering"] as never } },
    orderBy: { assignedAt: "asc" },
    include: { branch: true, items: { select: { name: true, qty: true } } },
  });

  return NextResponse.json({
    orders: orders.map((o) => {
      const addr = o.address as Record<string, unknown> | null;
      return {
        id: o.id,
        no: o.orderNo,
        status: o.status,
        total: Number(o.total),
        paymentStatus: o.paymentStatus,
        customer: o.customerName,
        phone: o.customerPhone,
        address: addr?.text ? String(addr.text) : null,
        note: o.notes,
        branch: (o.branch.name as Record<string, unknown>)?.ka ?? "",
        assignedAt: o.assignedAt,
        items: o.items.map((i) => ({
          name: (i.name as Record<string, unknown>)?.en ?? "",
          qty: i.qty,
        })),
      };
    }),
  });
}

/**
 * POST — mark delivered.
 *
 * ⚠️ The driver marking it is the point: the delivery time is then the real
 * one, not what an operator remembered later. That number is the only honest
 * source for "how long do our deliveries actually take".
 */
export async function POST(req: Request) {
  const session = await getDriverSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { id: body.id ?? "" },
    select: { id: true, orderNo: true, driverId: true, status: true, statusHistory: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.driverId !== session.sub) {
    return NextResponse.json({ error: "That order is not assigned to you" }, { status: 403 });
  }
  if (order.status === "completed") return NextResponse.json({ ok: true });

  const history = Array.isArray(order.statusHistory) ? (order.statusHistory as unknown[]) : [];

  await db.order.update({
    where: { id: order.id },
    data: {
      status: "completed",
      deliveredAt: new Date(),
      paymentStatus: "paid",
      statusHistory: [
        ...history,
        { status: "completed", at: new Date().toISOString(), by: session.name, via: "driver" },
      ] as object,
    },
  });

  await logAction({
    action: "order.delivered",
    entityType: "Order",
    entityId: order.id,
    after: { orderNo: order.orderNo, by: session.name },
    employeeId: session.sub,
  });

  return NextResponse.json({ ok: true });
}
