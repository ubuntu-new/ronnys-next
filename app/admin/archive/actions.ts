"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

/**
 * აღდგენა — `deletedAt` იშლება, `active` არ ვცვლით.
 * ანუ ჩანაწერი ზუსტად იმ მდგომარეობაში ბრუნდება, რომელშიც არქივში წავიდა.
 */

async function log(entityType: string, entityId: string, employeeId: string) {
  await db.auditLog.create({
    data: { action: `${entityType.toLowerCase()}.restore`, entityType, entityId, employeeId },
  });
  revalidatePath("/admin/archive");
}

export async function restoreProduct(id: string) {
  const s = await requirePermission("can_edit_menu");
  await db.product.update({ where: { id }, data: { deletedAt: null } });
  await log("Product", id, s.sub);
  revalidatePath("/admin/products");
}

export async function restoreTopping(id: string) {
  const s = await requirePermission("can_edit_menu");
  await db.topping.update({ where: { id }, data: { deletedAt: null } });
  await log("Topping", id, s.sub);
  revalidatePath("/admin/toppings");
}

export async function restoreCombo(id: string) {
  const s = await requirePermission("can_edit_menu");
  await db.combo.update({ where: { id }, data: { deletedAt: null } });
  await log("Combo", id, s.sub);
  revalidatePath("/admin/combos");
}

export async function restoreBranch(id: string) {
  const s = await requirePermission("can_edit_menu");
  await db.branch.update({ where: { id }, data: { deletedAt: null } });
  await log("Branch", id, s.sub);
  revalidatePath("/admin/branches");
}

export async function restoreCategory(id: string) {
  const s = await requirePermission("can_edit_menu");
  await db.category.update({ where: { id }, data: { deletedAt: null } });
  await log("Category", id, s.sub);
  revalidatePath("/admin/categories");
}

export async function restoreSubcategory(id: string) {
  const s = await requirePermission("can_edit_menu");
  await db.subcategory.update({ where: { id }, data: { deletedAt: null } });
  await log("Subcategory", id, s.sub);
  revalidatePath("/admin/categories");
}
