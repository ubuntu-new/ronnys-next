import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { hashPin } from "@/lib/pin";

/**
 * POS session — separate from the admin session on purpose.
 *
 * A terminal sits on a counter all day. It must NOT carry an admin cookie
 * that could reach staff records or settings. This session only ever proves
 * "employee X is on terminal Y", and it is short-lived.
 */

const COOKIE = "ronnys_pos";
const TTL_HOURS = 14; // one long shift

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export interface PosSession {
  sub: string; // employeeId
  name: string;
  role: string;
  branchId: string;
  posId: string;
}

export async function signInWithPin(pin: string, branchId: string, posId: string) {
  const employee = await db.employee.findFirst({
    where: { posPinHash: hashPin(pin), active: true, deletedAt: null },
    select: { id: true, name: true, role: true, branches: { select: { branchId: true } } },
  });
  if (!employee) return null;

  // A cashier assigned to Vake shouldn't be able to open the till in Gldani
  const allowed =
    employee.role === "super_admin" ||
    employee.branches.length === 0 ||
    employee.branches.some((b) => b.branchId === branchId);
  if (!allowed) return { error: "not_assigned_to_branch" as const };

  const token = await new SignJWT({
    name: employee.name,
    role: employee.role,
    branchId,
    posId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(employee.id)
    .setIssuedAt()
    .setExpirationTime(`${TTL_HOURS}h`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_HOURS * 3600,
  });

  return { employee };
}

export async function getPosSession(): Promise<PosSession | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, secret());
    return {
      sub: String(payload.sub),
      name: String(payload.name ?? ""),
      role: String(payload.role ?? ""),
      branchId: String(payload.branchId ?? ""),
      posId: String(payload.posId ?? ""),
    };
  } catch {
    return null;
  }
}

export async function posSignOut() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
