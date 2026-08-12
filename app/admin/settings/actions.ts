"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import { fdBool, fdNum, fdStr } from "@/lib/admin-utils";

async function put(key: string, value: object, employeeId: string) {
  await db.setting.upsert({
    where: { key },
    update: { value, updatedBy: employeeId },
    create: { key, value, updatedBy: employeeId },
  });
  await db.auditLog.create({
    data: { action: "setting.update", entityType: "Setting", entityId: key, employeeId },
  });
  revalidatePath("/admin/settings");
}

export async function saveOrderSettings(fd: FormData) {
  const s = await requirePermission("can_edit_menu");
  await put(
    "order",
    {
      minOrder: fdNum(fd, "minOrder") ?? 0,
      deliveryFee: fdNum(fd, "deliveryFee") ?? 0,
      freeDeliveryThreshold: fdNum(fd, "freeDeliveryThreshold") ?? 0,
      maxToppings: fdNum(fd, "maxToppings") ?? 6,
      currency: fdStr(fd, "currency") || "GEL",
    },
    s.sub,
  );
  redirect("/admin/settings?saved=order");
}

export async function saveLoyaltySettings(fd: FormData) {
  const s = await requirePermission("can_discount");
  await put(
    "loyalty",
    {
      enabled: fdBool(fd, "enabled"),
      pointsPerGel: fdNum(fd, "pointsPerGel") ?? 1,
      redeemRate: fdNum(fd, "redeemRate") ?? 0.1,
      minRedeem: fdNum(fd, "minRedeem") ?? 100,
    },
    s.sub,
  );
  redirect("/admin/settings?saved=loyalty");
}

export async function saveEmployeeDiscount(fd: FormData) {
  const s = await requirePermission("can_discount");
  await put(
    "employeeDiscount",
    {
      enabled: fdBool(fd, "enabled"),
      value: fdNum(fd, "value") ?? 0,
      mode: fdStr(fd, "mode") === "fixed" ? "fixed" : "percent",
      appliesEverywhere: fdBool(fd, "appliesEverywhere"),
    },
    s.sub,
  );
  redirect("/admin/settings?saved=employeeDiscount");
}

export async function saveDiscountRules(fd: FormData) {
  const s = await requirePermission("can_discount");
  await put(
    "discountRules",
    {
      stackable: fdBool(fd, "stackable"),
      excludeCombos: fdBool(fd, "excludeCombos"),
      excludePromoProducts: fdBool(fd, "excludePromoProducts"),
    },
    s.sub,
  );
  await put("discountVerification", { mode: fdStr(fd, "verification") || "manual" }, s.sub);
  redirect("/admin/settings?saved=discountRules");
}

export async function saveTax(fd: FormData) {
  const s = await requirePermission("can_edit_menu");
  await put("tax", { rate: fdNum(fd, "rate") ?? 0, inclusive: fdBool(fd, "inclusive") }, s.sub);
  redirect("/admin/settings?saved=tax");
}

export async function saveSocial(fd: FormData) {
  const s = await requirePermission("can_edit_menu");

  const current = await db.setting.findUnique({ where: { key: "social" } });
  const list = Array.isArray(current?.value) ? (current!.value as Array<Record<string, unknown>>) : [];

  const next = list.map((item) => {
    const id = String(item.id);
    return {
      id,
      label: String(item.label ?? id),
      href: fdStr(fd, `href_${id}`),
      enabled: fdBool(fd, `enabled_${id}`),
    };
  });

  await put("social", next as unknown as object, s.sub);
  redirect("/admin/settings?saved=social");
}

export async function saveTelegram(fd: FormData) {
  const s = await requirePermission("can_edit_menu");
  await put(
    "telegram",
    {
      enabled: fdBool(fd, "enabled"),
      chatId: fdStr(fd, "chatId"),
      events: {
        order: fdBool(fd, "ev_order"),
        transferRequest: fdBool(fd, "ev_transferRequest"),
        transferSent: fdBool(fd, "ev_transferSent"),
        lowStock: fdBool(fd, "ev_lowStock"),
      },
    },
    s.sub,
  );
  redirect("/admin/settings?saved=telegram");
}
