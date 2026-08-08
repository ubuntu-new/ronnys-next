"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import { fdBool, fdNum, fdStr } from "@/lib/admin-utils";

/** სიის გვერდიდან — ყველა ტოპინგის ფასი/სტატუსი ერთი შენახვით. */
export async function saveToppingPrices(fd: FormData) {
  const session = await requirePermission("can_edit_menu");

  const toppings = await db.topping.findMany({ include: { prices: true } });

  for (const t of toppings) {
    // checkbox გამორთულზე საერთოდ არ იგზავნება — ამიტომ ცალკე hidden ველი გვაქვს
    if (fd.get(`present_${t.id}`) !== null) {
      await db.topping.update({
        where: { id: t.id },
        data: { active: fdBool(fd, `active_${t.id}`) },
      });
    }
    for (const p of t.prices) {
      const v = fdNum(fd, `price_${t.id}_${p.sizeKey}`);
      if (v !== null) {
        await db.toppingPrice.update({ where: { id: p.id }, data: { price: v } });
      }
    }
  }

  await db.auditLog.create({
    data: { action: "toppings.bulkUpdate", entityType: "Topping", employeeId: session.sub },
  });

  revalidatePath("/admin/toppings");
  redirect("/admin/toppings?saved=1");
}

/** ერთი ტოპინგის სრული რედაქტირება. */
export async function updateTopping(id: string, fd: FormData) {
  const session = await requirePermission("can_edit_menu");

  const nameEn = fdStr(fd, "name_en");
  if (!nameEn) throw new Error("ინგლისური სახელი სავალდებულოა");

  await db.topping.update({
    where: { id },
    data: {
      name: { en: nameEn, ka: fdStr(fd, "name_ka") || nameEn },
      category: fdStr(fd, "category") || null,
      photo: fdStr(fd, "photo") || null,
      recipeOnly: fdBool(fd, "recipeOnly"),
      active: fdBool(fd, "active"),
      sortOrder: fdNum(fd, "sortOrder") ?? 0,
    },
  });

  const prices = await db.toppingPrice.findMany({ where: { toppingId: id } });
  for (const p of prices) {
    const v = fdNum(fd, `price_${p.sizeKey}`);
    if (v !== null) await db.toppingPrice.update({ where: { id: p.id }, data: { price: v } });
  }

  await db.auditLog.create({
    data: { action: "topping.update", entityType: "Topping", entityId: id, employeeId: session.sub },
  });

  revalidatePath("/admin/toppings");
  redirect("/admin/toppings?saved=1");
}
