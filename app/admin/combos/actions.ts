"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import { fdBool, fdNum, fdStr } from "@/lib/admin-utils";

export async function createCombo(fd: FormData) {
  const session = await requirePermission("can_edit_menu");
  const nameEn = fdStr(fd, "name_en");
  if (!nameEn) throw new Error("ინგლისური სახელი სავალდებულოა");

  const c = await db.combo.create({
    data: {
      name: { en: nameEn, ka: fdStr(fd, "name_ka") || nameEn },
      description: { en: "", ka: "" },
      pricingMode: fdStr(fd, "pricingMode") === "discount" ? "discount" : "fixed",
      price: fdNum(fd, "price"),
      percent: fdNum(fd, "percent"),
      discountable: false,
      active: false,
      sortOrder: 999,
    },
  });

  const slots = fdNum(fd, "slots") ?? 2;
  for (let i = 0; i < slots; i++) {
    await db.comboSlot.create({
      data: {
        comboId: c.id,
        label: { en: `Slot ${i + 1}`, ka: `სლოტი ${i + 1}` },
        mode: "choice",
        sortOrder: i,
      },
    });
  }

  await db.auditLog.create({
    data: { action: "combo.create", entityType: "Combo", entityId: c.id, employeeId: session.sub },
  });

  revalidatePath("/admin/combos");
  redirect(`/admin/combos/${c.id}`);
}

export async function updateCombo(id: string, fd: FormData) {
  const session = await requirePermission("can_edit_menu");

  const nameEn = fdStr(fd, "name_en");
  if (!nameEn) throw new Error("ინგლისური სახელი სავალდებულოა");

  const mode = fdStr(fd, "pricingMode") === "discount" ? "discount" : "fixed";
  const price = fdNum(fd, "price");
  const percent = fdNum(fd, "percent");

  if (mode === "fixed" && price === null) throw new Error("ფიქსირებული ფასი შეავსე");
  if (mode === "discount" && percent === null) throw new Error("ფასდაკლების პროცენტი შეავსე");

  const badgeEn = fdStr(fd, "badge_en");
  const validFrom = fdStr(fd, "validFrom");
  const validTo = fdStr(fd, "validTo");

  const allBranches = await db.branch.findMany({ where: { deletedAt: null }, select: { id: true } });
  const availableIn = fd.getAll("availableIn").map(String);
  const disabledBranches = fd.get("branches_present")
    ? allBranches.map((b) => b.id).filter((bid) => !availableIn.includes(bid))
    : undefined;

  await db.combo.update({
    where: { id },
    data: {
      name: { en: nameEn, ka: fdStr(fd, "name_ka") || nameEn },
      description: { en: fdStr(fd, "desc_en"), ka: fdStr(fd, "desc_ka") || fdStr(fd, "desc_en") },
      badge: badgeEn ? { en: badgeEn, ka: fdStr(fd, "badge_ka") || badgeEn } : undefined,
      photo: fdStr(fd, "photo") || null,
      pricingMode: mode,
      price: mode === "fixed" ? price : null,
      percent: mode === "discount" ? percent : null,
      active: fdBool(fd, "active"),
      sortOrder: fdNum(fd, "sortOrder") ?? 0,
      validFrom: validFrom ? new Date(validFrom) : null,
      validTo: validTo ? new Date(validTo) : null,
      ...(disabledBranches ? { disabledBranches } : {}),
    },
  });

  const slots = await db.comboSlot.findMany({ where: { comboId: id } });

  for (const s of slots) {
    if (fd.get(`slot_${s.id}_del`) !== null) {
      await db.comboSlot.delete({ where: { id: s.id } });
      continue;
    }

    const labelEn = fdStr(fd, `slot_${s.id}_label_en`);
    if (labelEn) {
      await db.comboSlot.update({
        where: { id: s.id },
        data: {
          label: { en: labelEn, ka: fdStr(fd, `slot_${s.id}_label_ka`) || labelEn },
          mode: fdStr(fd, `slot_${s.id}_mode`) === "fixed" ? "fixed" : "choice",
          sortOrder: fdNum(fd, `slot_${s.id}_order`) ?? 0,
        },
      });
    }

    if (fd.get(`slot_${s.id}_present`) !== null) {
      const picked = fd.getAll(`slot_${s.id}_opt`).map(String);
      await db.comboSlotOption.deleteMany({
        where: { slotId: s.id, productId: { notIn: picked.length ? picked : ["__none__"] } },
      });
      for (const productId of picked) {
        await db.comboSlotOption.upsert({
          where: { slotId_productId: { slotId: s.id, productId } },
          update: {},
          create: { slotId: s.id, productId },
        });
      }
    }
  }

  await db.auditLog.create({
    data: { action: "combo.update", entityType: "Combo", entityId: id, employeeId: session.sub },
  });

  revalidatePath("/admin/combos");
  redirect("/admin/combos?saved=1");
}

export async function addComboSlot(comboId: string) {
  await requirePermission("can_edit_menu");
  const n = await db.comboSlot.count({ where: { comboId } });
  await db.comboSlot.create({
    data: {
      comboId,
      label: { en: `Slot ${n + 1}`, ka: `სლოტი ${n + 1}` },
      mode: "choice",
      sortOrder: n,
    },
  });
  revalidatePath(`/admin/combos/${comboId}`);
}

/** არქივში გადატანა — ფიზიკურად არაფერი იშლება. */
export async function archiveCombo(id: string) {
  const session = await requirePermission("can_edit_menu");
  await db.combo.update({ where: { id }, data: { deletedAt: new Date() } });
  await db.auditLog.create({
    data: { action: "combo.archive", entityType: "Combo", entityId: id, employeeId: session.sub },
  });
  revalidatePath("/admin/combos");
  redirect("/admin/combos?archived=1");
}
