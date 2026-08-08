"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";
import { fdBool, fdNum, fdStr } from "@/lib/admin-utils";

export async function updateBranch(id: string, fd: FormData) {
  const session = await requirePermission("can_edit_menu");

  const code = fdStr(fd, "code").toUpperCase();
  const nameEn = fdStr(fd, "name_en");
  if (!code) throw new Error("ბრანჩის კოდი სავალდებულოა");
  if (!nameEn) throw new Error("ინგლისური სახელი სავალდებულოა");

  // კოდი უნიკალურია — შევამოწმოთ, სხვას ხომ არ უჭირავს
  const clash = await db.branch.findFirst({ where: { code, NOT: { id } } });
  if (clash) throw new Error(`კოდი "${code}" უკვე გამოიყენება სხვა ფილიალში`);

  const hoursText = fdStr(fd, "hours");

  await db.branch.update({
    where: { id },
    data: {
      code,
      name: { en: nameEn, ka: fdStr(fd, "name_ka") || nameEn },
      address: { en: fdStr(fd, "address_en"), ka: fdStr(fd, "address_ka") || fdStr(fd, "address_en") },
      phone: fdStr(fd, "phone") || null,
      hours: hoursText ? { display: { en: hoursText, ka: fdStr(fd, "hours_ka") || hoursText } } : undefined,
      lat: fdNum(fd, "lat"),
      lng: fdNum(fd, "lng"),
      active: fdBool(fd, "active"),
      sortOrder: fdNum(fd, "sortOrder") ?? 0,
    },
  });

  // ── POS ტერმინალები ──
  const terminals = await db.terminal.findMany({ where: { branchId: id } });
  for (const t of terminals) {
    if (fd.get(`term_${t.id}_present`) === null) continue;
    const labelEn = fdStr(fd, `term_${t.id}_label_en`);
    await db.terminal.update({
      where: { id: t.id },
      data: {
        label: labelEn ? { en: labelEn, ka: fdStr(fd, `term_${t.id}_label_ka`) || labelEn } : undefined,
        active: fdBool(fd, `term_${t.id}_active`),
        hasCardTerminal: fdBool(fd, `term_${t.id}_card`),
      },
    });
  }

  await db.auditLog.create({
    data: {
      action: "branch.update",
      entityType: "Branch",
      entityId: id,
      branchId: id,
      employeeId: session.sub,
    },
  });

  revalidatePath("/admin/branches");
  redirect("/admin/branches?saved=1");
}

/** ახალი POS ტერმინალი ბრანჩში. */
export async function addTerminal(branchId: string) {
  await requirePermission("can_edit_menu");

  const branch = await db.branch.findUnique({
    where: { id: branchId },
    include: { terminals: true },
  });
  if (!branch) throw new Error("ფილიალი ვერ მოიძებნა");

  const n = branch.terminals.length + 1;
  const posId = `${branch.code}-POS-${n}`;

  await db.terminal.create({
    data: {
      branchId,
      posId,
      label: { en: `POS ${n}`, ka: `POS ${n}` },
      active: true,
      hasCardTerminal: true,
    },
  });

  revalidatePath(`/admin/branches/${branchId}`);
}
