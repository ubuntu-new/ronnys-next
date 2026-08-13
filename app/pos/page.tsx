import { db } from "@/lib/db";
import { getMenu } from "@/lib/menu-db";
import { getPosSession } from "@/lib/pos-auth";
import { i18nText } from "@/lib/admin-utils";
import PosTerminal from "./PosTerminal";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const [session, branches, terminals, menu] = await Promise.all([
    getPosSession(),
    db.branch.findMany({ where: { deletedAt: null, active: true }, orderBy: { sortOrder: "asc" } }),
    db.terminal.findMany({ where: { active: true }, orderBy: { posId: "asc" } }),
    getMenu().catch(() => null),
  ]);

  return (
    <PosTerminal
      session={session}
      menu={menu}
      branches={branches.map((b) => ({ id: b.id, name: i18nText(b.name), code: b.code }))}
      terminals={terminals.map((t) => ({
        posId: t.posId,
        branchId: t.branchId,
        label: i18nText(t.label),
      }))}
    />
  );
}
