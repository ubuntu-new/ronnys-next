// scripts/patch-archive-page.mjs
// არქივის გვერდს ამატებს თანამშრომლებისა და ფასდაკლებების სექციებს.
// ორჯერ გაშვება უსაფრთხოა.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const P = "app/admin/archive/page.tsx";
const A = "app/admin/archive/actions.ts";

for (const f of [P, A]) {
  if (!existsSync(f)) {
    console.error(`ვერ ვიპოვე ${f}`);
    process.exit(1);
  }
}

// ── actions ──
let a = readFileSync(A, "utf8");
if (!a.includes("restoreEmployee")) {
  a += `
export async function restoreEmployee(id: string) {
  const s = await requirePermission("can_manage_staff");
  await db.employee.update({ where: { id }, data: { deletedAt: null } });
  await log("Employee", id, s.sub);
  revalidatePath("/admin/employees");
}

export async function restoreDiscount(id: string) {
  const s = await requirePermission("can_discount");
  await db.discount.update({ where: { id }, data: { deletedAt: null } });
  await log("Discount", id, s.sub);
  revalidatePath("/admin/discounts");
}
`;
  writeFileSync(A, a);
  console.log("✓ archive/actions.ts");
} else {
  console.log("archive/actions.ts უკვე განახლებულია");
}

// ── page ──
let p = readFileSync(P, "utf8");
if (p.includes("restoreEmployee")) {
  console.log("archive/page.tsx უკვე განახლებულია");
  process.exit(0);
}

p = p.replace(
  "  restoreSubcategory,\n} from \"./actions\";",
  "  restoreSubcategory,\n  restoreEmployee,\n  restoreDiscount,\n} from \"./actions\";",
);

p = p.replace(
  "  ]);\n\n  const total =",
  `    db.employee.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
    db.discount.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
  ]);

  const total =`,
);

p = p.replace(
  "  const [products, toppings, combos, branches, categories, subcategories] = await Promise.all([",
  "  const [products, toppings, combos, branches, categories, subcategories, employees, discounts] =\n    await Promise.all([",
);

p = p.replace(
  "products.length + toppings.length + combos.length + branches.length + categories.length + subcategories.length;",
  "products.length +\n    toppings.length +\n    combos.length +\n    branches.length +\n    categories.length +\n    subcategories.length +\n    employees.length +\n    discounts.length;",
);

p = p.replace(
  "  ].filter((s) => s.rows.length > 0);",
  `    {
      title: "თანამშრომლები",
      rows: employees.map((e) => ({
        id: e.id,
        name: e.name,
        note: e.role,
        at: e.deletedAt,
        active: e.active,
        action: restoreEmployee.bind(null, e.id),
      })),
    },
    {
      title: "ფასდაკლებები",
      rows: discounts.map((d) => ({
        id: d.id,
        name: i18nText(d.name),
        note: d.type,
        at: d.deletedAt,
        active: d.active,
        action: restoreDiscount.bind(null, d.id),
      })),
    },
  ].filter((s) => s.rows.length > 0);`,
);

writeFileSync(P, p);
console.log("✓ archive/page.tsx");
