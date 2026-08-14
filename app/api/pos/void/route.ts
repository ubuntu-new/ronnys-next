import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPosSession } from "@/lib/pos-auth";
import { hashPin, isValidPin } from "@/lib/pin";
import { recordMovements } from "@/lib/stock";
import { logAction } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Voiding a sale from the till.
 *
 * ⚠️ This is the single most important control on any POS. A cashier who can
 * cancel a completed sale unsupervised can take the cash and leave no trace.
 * So a void requires:
 *
 *   • a SECOND person's PIN — someone holding `can_void`
 *   • a written reason
 *   • an audit entry naming both people
 *
 * Stock is returned with counter-entries rather than by deleting the
 * originals: the ledger must stay append-only, or "why is the balance this
 * number" loses its answer.
 */
export async function POST(req: Request) {
  const session = await getPosSession();
  if (!session) return NextResponse.json({ error: "Session expired" }, { status: 401 });

  let body: { orderId?: string; pin?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const reason = (body.reason ?? "").trim();
  if (reason.length < 3) return NextResponse.json({ error: "A reason is required" }, { status: 400 });
  if (!isValidPin(body.pin ?? "")) return NextResponse.json({ error: "Enter the manager PIN" }, { status: 400 });

  // ── who authorised it ──
  const approver = await db.employee.findFirst({
    where: { posPinHash: hashPin(body.pin!), active: true, deletedAt: null },
    select: { id: true, name: true, role: true, permissions: true },
  });
  if (!approver) return NextResponse.json({ error: "PIN not recognised" }, { status: 401 });

  const canVoid = approver.role === "super_admin" || approver.permissions.includes("can_void");
  if (!canVoid) return NextResponse.json({ error: "This person cannot authorise a void" }, { status: 403 });

  // The point is a second pair of eyes — approving your own void defeats it
  if (approver.id === session.sub) {
    return NextResponse.json({ error: "A void must be authorised by someone else" }, { status: 403 });
  }

  const order = await db.order.findUnique({
    where: { id: body.orderId ?? "" },
    select: { id: true, orderNo: true, status: true, branchId: true, total: true, statusHistory: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.branchId !== session.branchId) {
    return NextResponse.json({ error: "That order belongs to another branch" }, { status: 403 });
  }
  if (order.status === "cancelled") return NextResponse.json({ error: "Already cancelled" }, { status: 409 });

  // ── return the stock ──
  const moves = await db.stockMovement.findMany({
    where: { refType: "Order", refId: order.id, type: "sale" },
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
        refId: order.id,
        note: `Order #${order.orderNo} voided — stock returned`,
        employeeId: session.sub,
      })),
    );
  }

  const history = Array.isArray(order.statusHistory) ? (order.statusHistory as unknown[]) : [];

  await db.order.update({
    where: { id: order.id },
    data: {
      status: "cancelled",
      paymentStatus: "refunded",
      statusHistory: [
        ...history,
        {
          status: "cancelled",
          at: new Date().toISOString(),
          by: session.name,
          approvedBy: approver.name,
          reason,
        },
      ] as object,
    },
  });

  await logAction({
    action: "order.void",
    entityType: "Order",
    entityId: order.id,
    branchId: session.branchId,
    before: { status: order.status, total: Number(order.total) },
    after: { reason, cashier: session.name, approvedBy: approver.name, posId: session.posId },
    employeeId: session.sub,
  });

  return NextResponse.json({ ok: true, approvedBy: approver.name });
}
