import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kitchen display feed.
 *
 * Polled every few seconds by the board. Deliberately a plain endpoint
 * rather than websockets: a kitchen screen on hotel-grade wifi reconnects
 * badly, and polling recovers on its own after a dropout.
 */

const OPEN = ["new", "confirmed", "preparing", "ready"] as const;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const branchId = new URL(req.url).searchParams.get("branch");
  if (!branchId) return NextResponse.json({ error: "branch required" }, { status: 400 });

  const orders = await db.order.findMany({
    where: { branchId, status: { in: OPEN as unknown as string[] } as never },
    orderBy: { createdAt: "asc" },
    include: { items: true },
  });

  const drivers = await db.employee.findMany({
    where: { role: "driver", active: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    at: new Date().toISOString(),
    drivers,
    orders: orders.map((o) => ({
      id: o.id,
      no: o.orderNo,
      status: o.status,
      type: o.fulfillmentType,
      createdAt: o.createdAt,
      customer: o.customerName,
      note: o.notes,
      source: o.source,
      items: o.items.map((i) => ({
        id: i.id,
        kind: i.kind,
        name: (i.name as Record<string, unknown>)?.en ?? "",
        nameKa: (i.name as Record<string, unknown>)?.ka ?? "",
        qty: i.qty,
        config: i.config,
      })),
    })),
  });
}

/** Status change from the board. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { id?: string; status?: string; driverId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const allowed = ["confirmed", "preparing", "ready", "delivering", "completed"];
  if (!body.id || !body.status || !allowed.includes(body.status)) {
    return NextResponse.json({ error: "bad status" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { id: body.id },
    select: { statusHistory: true, status: true },
  });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (order.status === "completed" || order.status === "cancelled") {
    return NextResponse.json({ error: "order is closed" }, { status: 409 });
  }

  const history = Array.isArray(order.statusHistory) ? (order.statusHistory as unknown[]) : [];

  // ── driver assignment ──
  // Recorded with the status change, so "who took it" and "when" are one fact.
  const assign =
    body.status === "delivering" && body.driverId
      ? { driverId: body.driverId, assignedAt: new Date() }
      : {};

  await db.order.update({
    where: { id: body.id },
    data: {
      ...assign,
      status: body.status as never,
      statusHistory: [
        ...history,
        { status: body.status, at: new Date().toISOString(), by: session.name ?? "kitchen" },
      ] as object,
      ...(body.status === "completed" ? { deliveredAt: new Date() } : {}),
    },
  });

  await db.auditLog.create({
    data: {
      action: `order.${body.status}`,
      entityType: "Order",
      entityId: body.id,
      employeeId: session.sub,
      after: { via: "kds" },
    },
  });

  return NextResponse.json({ ok: true });
}
