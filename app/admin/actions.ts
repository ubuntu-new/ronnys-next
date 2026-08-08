"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, destroySession, requirePermission } from "@/lib/admin-auth";
import { fdBool, fdNum, fdStr } from "@/lib/admin-utils";

// ─────────────────────────────────────────────
// AUTH
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

// ─────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────

export async function toggleProduct(id: string, active: boolean) {
  await requirePermission("can_edit_menu");
  await db.product.update({ where: { id }, data: { active } });
  revalidatePath("/admin/products");
}

export async function updateProduct(id: string, fd: FormData) {
  const session = await requirePermission("can_edit_menu");

  const nameEn = fdStr(fd, "name_en");
  if (!nameEn) throw new Error("ინგლისური სახელი სავალდებულოა");

  const badgeEn = fdStr(fd, "badge_en");

  await db.product.update({
    where: { id },
    data: {
      name: { en: nameEn, ka: fdStr(fd, "name_ka") || nameEn },
      description: {
        en: fdStr(fd, "desc_en"),
        ka: fdStr(fd, "desc_ka") || fdStr(fd, "desc_en"),
      },
      badge: badgeEn ? { en: badgeEn, ka: fdStr(fd, "badge_ka") || badgeEn } : undefined,
      photo: fdStr(fd, "photo") || null,
      price: fdNum(fd, "price"),
      sortOrder: fdNum(fd, "sortOrder") ?? 0,
      active: fdBool(fd, "active"),
      discountable: fdBool(fd, "discountable"),
      updatedBy: session.sub,
    },
  });

  // ზომების ფასები (პიცა)
  const sizes = await db.productSize.findMany({ where: { productId: id } });
  for (const s of sizes) {
    const p = fdNum(fd, `size_${s.key}`);
    if (p !== null) {
      await db.productSize.update({ where: { id: s.id }, data: { price: p } });
    }
  }

  // აქცია
  const promoActive = fdBool(fd, "promo_active");
  const promoValue = fdNum(fd, "promo_value");
  if (promoActive && promoValue !== null) {
    const label = `-${promoValue}${fdStr(fd, "promo_mode") === "fixed" ? "₾" : "%"}`;
    await db.productPromo.upsert({
      where: { productId: id },
      update: {
        active: true,
        mode: fdStr(fd, "promo_mode") === "fixed" ? "fixed" : "percent",
        value: promoValue,
        label: { en: label, ka: label },
      },
      create: {
        productId: id,
        active: true,
        mode: fdStr(fd, "promo_mode") === "fixed" ? "fixed" : "percent",
        value: promoValue,
        label: { en: label, ka: label },
      },
    });
  } else {
    await db.productPromo.updateMany({ where: { productId: id }, data: { active: false } });
  }

  await db.auditLog.create({
    data: {
      action: "product.update",
      entityType: "Product",
      entityId: id,
      employeeId: session.sub,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  redirect("/admin/products?saved=1");
}
