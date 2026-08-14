import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPosSession } from "@/lib/pos-auth";
import { normalizePhone, addressLine } from "@/lib/phone";
import { logAction } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Customer lookup and creation from the till.
 *
 * The phone is the key: one person, one record. The cashier types a number,
 * we normalise it, and either the customer is already there — with their
 * saved addresses and loyalty balance — or we create them on the spot.
 */

function shape(u: {
  id: string;
  name: string | null;
  phone: string | null;
  loyaltyPoints: number;
  orderCount: number;
  addresses: { id: string; title: string | null; street: string; building: string | null; apt: string | null; entrance: string | null; floor: string | null; note: string | null; isDefault: boolean }[];
}) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    points: u.loyaltyPoints,
    orders: u.orderCount,
    addresses: u.addresses.map((a) => ({
      id: a.id,
      title: a.title,
      line: addressLine(a),
      note: a.note,
      isDefault: a.isDefault,
    })),
  };
}

/** GET /api/pos/customers?phone=… — find by phone */
export async function GET(req: Request) {
  const session = await getPosSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;

  // ── ავტოშევსება: ნაწილობრივი ძებნა ნომრითა და სახელით ──
  const q = (params.get("q") ?? "").trim();
  if (q) {
    if (q.length < 3) return NextResponse.json({ results: [] });

    const digits = q.replace(/\D/g, "");
    // "599" უნდა იპოვოს "995599123456" — ამიტომ contains, არა startsWith
    const where = digits.length >= 3
      ? { OR: [{ phone: { contains: digits } }, { name: { contains: q, mode: "insensitive" as const } }] }
      : { name: { contains: q, mode: "insensitive" as const } };

    const found = await db.user.findMany({
      where,
      include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] } },
      // მუდმივი კლიენტები ზემოთ — მათ უფრო ხშირად ეძებენ
      orderBy: [{ orderCount: "desc" }, { lastOrderAt: "desc" }],
      take: 8,
    });

    return NextResponse.json({ results: found.map(shape) });
  }

  const raw = params.get("phone") ?? "";
  const phone = normalizePhone(raw);
  if (!phone) return NextResponse.json({ customer: null });

  const user = await db.user.findUnique({
    where: { phone },
    include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] } },
  });

  return NextResponse.json({ customer: user ? shape(user) : null, normalized: phone });
}

/** POST — create a customer, or add an address to an existing one */
export async function POST(req: Request) {
  const session = await getPosSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    phone?: string;
    name?: string;
    address?: { street?: string; building?: string; apt?: string; entrance?: string; floor?: string; note?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone ?? "");
  if (!phone) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });

  const name = (body.name ?? "").trim() || null;

  // upsert on the phone — a race between two terminals must not create two people
  const user = await db.user.upsert({
    where: { phone },
    update: name ? { name } : {},
    create: { phone, name },
    include: { addresses: true },
  });

  const street = body.address?.street?.trim();
  if (street) {
    const created = await db.address.create({
      data: {
        userId: user.id,
        street,
        building: body.address?.building?.trim() || null,
        apt: body.address?.apt?.trim() || null,
        entrance: body.address?.entrance?.trim() || null,
        floor: body.address?.floor?.trim() || null,
        note: body.address?.note?.trim() || null,
        isDefault: user.addresses.length === 0,
      },
    });
    user.addresses.push(created);
  }

  await logAction({
    action: "customer.upsertFromPos",
    entityType: "User",
    entityId: user.id,
    branchId: session.branchId,
    after: { phone, name, addressAdded: !!street },
    employeeId: session.sub,
  });

  const full = await db.user.findUnique({
    where: { id: user.id },
    include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] } },
  });

  return NextResponse.json({ customer: full ? shape(full) : null });
}
