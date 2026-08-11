import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * შეტყობინებების რიცხვები.
 *
 * ⚠️ ცალკე `Notification` ცხრილი განზრახ არ არსებობს — რიცხვები პირდაპირ
 * მონაცემებიდან გამოითვლება. ასე ისინი ვერასდროს გაცდება რეალობას
 * (არ არის სინქრონიზაციის ბაგი, არ რჩება „მოჩვენებითი" შეტყობინება).
 *
 * ცალკე ცხრილი მაშინ დაგვჭირდება, როცა „წაკითხული/წაუკითხავი" თითო
 * ადამიანზე მოგვინდება.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [newOrders, toApprove, inTransit, levels] = await Promise.all([
    db.order.count({ where: { status: "new" } }),
    db.transfer.count({ where: { status: "requested" } }),
    db.transfer.count({ where: { status: "sent" } }),
    db.stockLevel.findMany({
      where: { minLevel: { not: null } },
      select: { qty: true, minLevel: true },
    }),
  ]);

  const lowStock = levels.filter((l) => Number(l.qty) <= Number(l.minLevel)).length;

  return NextResponse.json({
    items: [
      { key: "orders", label: "ახალი შეკვეთა", count: newOrders, href: "/admin/orders?status=new" },
      { key: "approve", label: "დასამტკიცებელი მოთხოვნა", count: toApprove, href: "/admin/stock/transfers?status=requested" },
      { key: "transit", label: "მისაღები გზავნილი", count: inTransit, href: "/admin/stock/transfers?status=sent" },
      { key: "low", label: "ამოწურვის ზღვარზე", count: lowStock, href: "/admin/stock/replenish" },
    ].filter((i) => i.count > 0),
  });
}
