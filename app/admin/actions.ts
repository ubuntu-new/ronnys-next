"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/admin-auth";
import { fdStr } from "@/lib/admin-utils";

// ─────────────────────────────────────────────
// AUTH — მხოლოდ ავტორიზაცია; დანარჩენი actions
// თითოეული განყოფილების საკუთარ ფაილშია.
// ─────────────────────────────────────────────

export async function login(_prev: string | null, fd: FormData): Promise<string | null> {
  const email = fdStr(fd, "email").toLowerCase();
  const password = fdStr(fd, "password");
  const next = fdStr(fd, "next") || "/admin";

  if (!email || !password) return "შეავსე ორივე ველი.";

  const emp = await db.employee.findUnique({ where: { email } });
  // ერთი და იგივე შეტყობინება — არ ვამხელთ, ანგარიში არსებობს თუ არა
  if (!emp || !emp.active || !emp.passwordHash) return "მონაცემები არასწორია.";

  const ok = await bcrypt.compare(password, emp.passwordHash);
  if (!ok) return "მონაცემები არასწორია.";

  await createSession({
    sub: emp.id,
    name: emp.name,
    role: emp.role,
    permissions: emp.permissions,
  });

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}
