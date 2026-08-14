import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { hashPin } from "@/lib/pin";

/**
 * Driver session — its own cookie, like the POS one.
 *
 * A courier's phone is the least controlled device in the company: it goes
 * home, it gets lent, it gets lost. This session proves only "driver X" and
 * nothing else, and it expires with the shift.
 */

const COOKIE = "ronnys_driver";
const TTL_HOURS = 14;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export interface DriverSession {
  sub: string;
  name: string;
}

export async function driverSignIn(pin: string) {
  const employee = await db.employee.findFirst({
    where: { posPinHash: hashPin(pin), active: true, deletedAt: null },
    select: { id: true, name: true, role: true },
  });
  if (!employee) return null;
  if (employee.role !== "driver" && employee.role !== "super_admin") {
    return { error: "not_a_driver" as const };
  }

  const token = await new SignJWT({ name: employee.name })
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

export async function getDriverSession(): Promise<DriverSession | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    return { sub: String(payload.sub), name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

export async function driverSignOut() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
