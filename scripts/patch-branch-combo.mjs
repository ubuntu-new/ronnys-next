// scripts/patch-branch-combo.mjs
//
//  1. combos/actions.ts — ფილიალები BranchCombo-ში იწერება, არა მასივში
//  2. combos/[id]/page.tsx — მდგომარეობა BranchCombo-დან + გაფრთხილება
//  3. combos/page.tsx — ბეიჯი „N ფილიალში გამორთული"
//  4. lib/menu-db.ts — კომბო ქრება საიტიდან, თუ ყველგან გამორთულია
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) actions ──
{
  const F = "app/admin/combos/actions.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("branchCombo")) {
    skip.push("actions");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      `  const allBranches = await db.branch.findMany({ where: { deletedAt: null }, select: { id: true } });
  const availableIn = fd.getAll("availableIn").map(String);
  const disabledBranches = fd.get("branches_present")
    ? allBranches.map((b) => b.id).filter((bid) => !availableIn.includes(bid))
    : undefined;`,
      `  // ფილიალები — ახლა BranchCombo-ში (მასივი აღარ გამოიყენება)
  const allBranches = await db.branch.findMany({ where: { deletedAt: null }, select: { id: true } });
  const availableIn = new Set(fd.getAll("availableIn").map(String));`,
    );

    s = s.replace(
      `      ...(disabledBranches ? { disabledBranches } : {}),
    },
  });`,
      `    },
  });

  // ── ხელმისაწვდომობა ფილიალებში ──
  if (fd.get("branches_present") !== null) {
    for (const b of allBranches) {
      const available = availableIn.has(b.id);
      const existing = await db.branchCombo.findUnique({
        where: { branchId_comboId: { branchId: b.id, comboId: id } },
      });
      if (!existing) {
        if (available) continue; // ჩანაწერის არარსებობა = ხელმისაწვდომია
        await db.branchCombo.create({
          data: { branchId: b.id, comboId: id, available: false, updatedBy: session.sub },
        });
        continue;
      }
      if (existing.available !== available) {
        await db.branchCombo.update({
          where: { id: existing.id },
          data: { available, updatedBy: session.sub },
        });
      }
    }
  }`,
    );

    if (s.includes("disabledBranches")) {
      console.error("⚠ actions.ts-ში disabledBranches დარჩა — ხელით შეამოწმე");
      process.exit(1);
    }

    writeFileSync(F, s);
    console.log("✓ app/admin/combos/actions.ts");
  }
}

// ── 2) დეტალი ──
{
  const F = "app/admin/combos/[id]/page.tsx";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("branchCombos")) {
    skip.push("combos/[id]");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      "      include: { slots: { orderBy: { sortOrder: \"asc\" }, include: { options: true } } },",
      "      include: {\n        slots: { orderBy: { sortOrder: \"asc\" }, include: { options: true } },\n        branchCombos: true,\n      },",
    );

    s = s.replace(
      "  const disabled = new Set(c.disabledBranches);",
      "  const disabled = new Set(c.branchCombos.filter((bc) => !bc.available).map((bc) => bc.branchId));\n" +
        "  const goneEverywhere = branches.length > 0 && disabled.size >= branches.length;",
    );

    s = s.replace(
      `          <h2>ხელმისაწვდომობა ფილიალებში</h2>
          <input type="hidden" name="branches_present" value="1" />`,
      `          <h2>ხელმისაწვდომობა ფილიალებში</h2>
          <input type="hidden" name="branches_present" value="1" />
          {goneEverywhere && (
            <div className="alert alert-error">
              <b>არცერთ ფილიალში არ იყიდება</b> — ეს კომბო საიტზე საერთოდ არ ჩანს.
            </div>
          )}
          {!goneEverywhere && disabled.size > 0 && (
            <div className="alert" style={{ background: "#fdf3d6", color: "#8a6a12" }}>
              გამორთულია {disabled.size} ფილიალში:{" "}
              {branches.filter((b) => disabled.has(b.id)).map((b) => i18nText(b.name)).join(", ")}
            </div>
          )}`,
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/combos/[id]/page.tsx");
  }
}

// ── 3) სია ──
{
  const F = "app/admin/combos/page.tsx";
  let s = readFileSync(F, "utf8");

  if (s.includes("branchCombos")) {
    skip.push("combos/page");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      "    include: { slots: { include: { options: true } } },",
      "    include: { slots: { include: { options: true } }, branchCombos: true },",
    );

    s = s.replace(
      "  const sp = await searchParams;",
      "  const sp = await searchParams;\n  const branchCount = await db.branch.count({ where: { deletedAt: null } });",
    );

    s = s.replace(
      `                <td>
                  <span className={c.active ? "badge badge-on" : "badge badge-off"}>
                    {c.active ? "ჩართული" : "გამორთული"}
                  </span>
                </td>`,
      `                <td>
                  <span className={c.active ? "badge badge-on" : "badge badge-off"}>
                    {c.active ? "ჩართული" : "გამორთული"}
                  </span>
                  {(() => {
                    const off = c.branchCombos.filter((bc) => !bc.available).length;
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
    console.log("✓ app/admin/combos/page.tsx");
  }
}

// ── 4) საიტის ფილტრი ──
{
  const F = "lib/menu-db.ts";
  let s = readFileSync(F, "utf8");

  if (s.includes("branchCombos")) {
    skip.push("menu-db");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      `        slots: {
          orderBy: { sortOrder: "asc" },
          include: { options: { include: { product: true } } },
        },`,
      `        slots: {
          orderBy: { sortOrder: "asc" },
          include: { options: { include: { product: true } } },
        },
        branchCombos: true,`,
    );

    s = s.replace(
      "  products = products.filter(soldSomewhere);",
      "  products = products.filter(soldSomewhere);\n" +
        "  // იგივე წესი კომბოებზე — ყველგან გამორთული საიტზე არ ჩანს\n" +
        "  combos = combos.filter((c) => {\n" +
        "    if (branchCount === 0) return true;\n" +
        "    const off = c.branchCombos.filter((bc) => !bc.available).length;\n" +
        "    return off < branchCount;\n" +
        "  });",
    );

    if (!s.includes("combos = combos.filter")) {
      console.error("⚠ ვერ ჩავამატე კომბოს ფილტრი — ხელით შეამოწმე menu-db.ts");
      process.exit(1);
    }

    writeFileSync(F, s);
    console.log("✓ lib/menu-db.ts");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
