"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

/**
 * მატრიცის შენახვა: სტრიქონი = პროდუქტი, სვეტი = ფილიალი.
 *
 * ფორმა მხოლოდ მონიშნულებს აგზავნის, ამიტომ თითო სტრიქონს თან ახლავს
 * `row` — რომ ვიცოდეთ, პროდუქტი საერთოდ იყო თუ არა ფორმაში
 * (გაფილტრულმა ხედმა სხვები არ უნდა შეცვალოს).
 */
export async function saveAvailability(fd: FormData) {
  const session = await requirePermission("can_edit_menu");

  const branches = await db.branch.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  const productIds = fd.getAll("row").map(String).filter(Boolean);
  let changed = 0;

  for (const productId of productIds) {
    const availableIn = new Set(fd.getAll(`av_${productId}`).map(String));

    for (const b of branches) {
      const available = availableIn.has(b.id);

      const existing = await db.branchProduct.findUnique({
        where: { branchId_productId: { branchId: b.id, productId } },
      });

      // ჩანაწერის არარსებობა = ხელმისაწვდომია. ზედმეტ სტრიქონს არ ვქმნით.
      if (!existing) {
        if (available) continue;
        await db.branchProduct.create({
          data: { branchId: b.id, productId, available: false, updatedBy: session.sub },
        });
        changed++;
        continue;
      }

      if (existing.available === available) continue;

      // stock/min/target-ის მქონე ჩანაწერს არ ვშლით — მხოლოდ ფლაგს ვცვლით
      await db.branchProduct.update({
        where: { id: existing.id },
        data: { available, updatedBy: session.sub },
      });
      changed++;
    }
  }

  if (changed > 0) {
    await db.auditLog.create({
      data: {
        action: "availability.update",
        entityType: "BranchProduct",
        employeeId: session.sub,
        after: { changed },
      },
    });
  }

  revalidatePath("/admin/availability");
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  redirect(`/admin/availability?saved=${changed}`);
}

/** ერთი პროდუქტის ჩართვა ყველგან — სწრაფი ღილაკი. */
export async function enableEverywhere(productId: string) {
  const session = await requirePermission("can_edit_menu");

  await db.branchProduct.updateMany({
    where: { productId, available: false },
    data: { available: true, updatedBy: session.sub },
  });

  revalidatePath("/admin/availability");
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
}
