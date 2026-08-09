// scripts/patch-product-pages.mjs
//
// 1. პროდუქტის რედაქტირება — ფილიალები BranchProduct-იდან + გაფრთხილება
// 2. პროდუქტების სია — ბეიჯი „გამორთულია N ფილიალში“
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const skip = [];
let done = 0;

// ── 1) products/[id]/page.tsx ──
{
  const F = "app/admin/products/[id]/page.tsx";
  if (!existsSync(F)) throw new Error(`ვერ ვიპოვე ${F}`);
  let s = readFileSync(F, "utf8");

  if (s.includes("branchProducts")) {
    skip.push("products/[id]");
  } else {
    s = s.replace(
      "        promo: true,\n        ingredients: true,",
      "        promo: true,\n        ingredients: true,\n        branchProducts: true,",
    );

    s = s.replace(
      "  const disabled = new Set(p.disabledBranches);",
      "  const disabled = new Set(p.branchProducts.filter((bp) => !bp.available).map((bp) => bp.branchId));\n" +
        "  const goneEverywhere = branches.length > 0 && disabled.size >= branches.length;",
    );

    s = s.replace(
      `          <h2>ხელმისაწვდომობა ფილიალებში</h2>
          <input type="hidden" name="branches_present" value="1" />`,
      `          <h2>ხელმისაწვდომობა ფილიალებში</h2>
          <input type="hidden" name="branches_present" value="1" />
          {goneEverywhere && (
            <div className="alert alert-error">
              <b>არცერთ ფილიალში არ იყიდება</b> — ეს პროდუქტი საიტზე საერთოდ არ ჩანს.
            </div>
          )}
          {!goneEverywhere && disabled.size > 0 && (
            <div className="alert" style={{ background: "#fdf3d6", color: "#8a6a12" }}>
              გამორთულია {disabled.size} ფილიალში:{" "}
              {branches.filter((b) => disabled.has(b.id)).map((b) => i18nText(b.name)).join(", ")}
            </div>
          )}`,
    );

    s = s.replace(
      `          <span className="hint">მოხსნილი = ამ ფილიალში არ იყიდება.</span>`,
      `          <span className="hint">
            მოხსნილი = ამ ფილიალში დროებით არ იყიდება. სამუდამოდ მოსაშორებლად „ჩართული“ გადამრთველია.
          </span>`,
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/products/[id]/page.tsx");
    done++;
  }
}

// ── 2) products/page.tsx ──
{
  const F = "app/admin/products/page.tsx";
  if (!existsSync(F)) throw new Error(`ვერ ვიპოვე ${F}`);
  let s = readFileSync(F, "utf8");

  if (s.includes("branchProducts")) {
    skip.push("products/page");
  } else {
    s = s.replace(
      "    include: { category: true, sizes: { orderBy: { sortOrder: \"asc\" } }, promo: true },",
      "    include: {\n      category: true,\n      sizes: { orderBy: { sortOrder: \"asc\" } },\n      promo: true,\n      branchProducts: true,\n    },",
    );

    s = s.replace(
      "  const categories = await db.category.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: \"asc\" } });",
      "  const categories = await db.category.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: \"asc\" } });\n" +
        "  const branchCount = await db.branch.count({ where: { deletedAt: null } });",
    );

    s = s.replace(
      `                <td>
                  <span className={p.active ? "badge badge-on" : "badge badge-off"}>
                    {p.active ? "ჩართული" : "გამორთული"}
                  </span>
                </td>`,
      `                <td>
                  <span className={p.active ? "badge badge-on" : "badge badge-off"}>
                    {p.active ? "ჩართული" : "გამორთული"}
                  </span>
                  {(() => {
                    const off = p.branchProducts.filter((bp) => !bp.available).length;
                    if (off === 0) return null;
                    const gone = branchCount > 0 && off >= branchCount;
                    return (
                      <div style={{ marginTop: 4 }}>
                        <span
                          className="badge"
                          style={
                            gone
                              ? { background: "#fdecea", color: "var(--a-danger)" }
                              : { background: "#fdf3d6", color: "#8a6a12" }
                          }
                        >
                          {gone ? "არსად არ იყიდება" : \`\${off} ფილიალში გამორთული\`}
                        </span>
                      </div>
                    );
                  })()}
                </td>`,
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/products/page.tsx");
    done++;
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log(`\nგანახლდა ${done} ფაილი`);
