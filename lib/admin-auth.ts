import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "ronnys_admin";
const MAX_AGE = 60 * 60 * 12; // 12 საათი

export interface AdminSession {
  sub: string; // employee id
  name: string;
  role: string;
  permissions: string[];
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET არ არის განსაზღვრული (.env)");
  return new TextEncoder().encode(s);
}

export async function createSession(payload: AdminSession) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function getSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      sub: String(payload.sub),
      name: String(payload.name ?? ""),
      role: String(payload.role ?? ""),
      permissions: (payload.permissions as string[]) ?? [],
    };
  } catch {
    return null;
  }
}

/** super_admin ყველაფერს აკეთებს; დანარჩენებს permission სჭირდებათ. */
export function can(session: AdminSession | null, permission: string) {
  if (!session) return false;
  if (session.role === "super_admin") return true;
  return session.permissions.includes(permission);
}

/** Server action-ებში: სესია + უფლება, თორემ ისვრის. */
export async function requirePermission(permission: string) {
  const session = await getSession();
  if (!can(session, permission)) throw new Error("არ გაქვს ამის უფლება");
  return session!;
}
