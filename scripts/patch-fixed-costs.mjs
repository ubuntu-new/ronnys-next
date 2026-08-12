// scripts/patch-fixed-costs.mjs
//
// ფიქსირებული ხარჯები პარამეტრებში — ქირა, კომუნალური, სხვა.
// ამის გარეშე დაფა სუფთა მოგებას **განზრახ არ აჩვენებს**: „მოგება"
// ქირისა და ხელფასის გარეშე ტყუილი რიცხვია.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const A = "app/admin/settings/actions.ts";
const P = "app/admin/settings/page.tsx";

for (const f of [A, P]) {
  if (!existsSync(f)) { console.error(`ვერ ვიპოვე ${f}`); process.exit(1); }
}

// ── actions ──
{
  let a = readFileSync(A, "utf8");
  if (a.includes("saveFixedCosts")) {
    console.log("actions.ts უკვე დაპატჩილია");
  } else {
    copyFileSync(A, A + ".bak");
    a += `
export async function saveFixedCosts(fd: FormData) {
  const s = await requirePermission("can_view_reports");
  await put(
    "fixedCosts",
    {
      rent: fdNum(fd, "rent") ?? 0,
      utilities: fdNum(fd, "utilities") ?? 0,
      other: fdNum(fd, "other") ?? 0,
    },
    s.sub,
  );
  redirect("/admin/settings?saved=fixedCosts");
}
`;
    writeFileSync(A, a);
    console.log("✓ app/admin/settings/actions.ts");
  }
}

// ── page ──
{
  let p = readFileSync(P, "utf8");
  if (p.includes("saveFixedCosts")) {
    console.log("page.tsx უკვე დაპატჩილია");
  } else {
    copyFileSync(P, P + ".bak");

    p = p.replace('  saveSocial,\n} from "./actions";', '  saveSocial,\n  saveFixedCosts,\n} from "./actions";');
    if (!p.includes("saveFixedCosts,")) {
      console.error("⚠ ვერ ჩავამატე იმპორტი — ხელით შეამოწმე");
      process.exit(1);
    }

    p = p.replace("  const social = Array.isArray(map.social)", "  const fc = obj(map.fixedCosts);\n  const social = Array.isArray(map.social)");

    p = p.replace(
      "      {/* ── გადასახადი ── */}",
      `      {/* ── ფიქსირებული ხარჯები ── */}
      <form className="admin-panel admin-form" action={saveFixedCosts} style={{ maxWidth: "none" }}>
        <h2>ფიქსირებული ხარჯები (თვეში)</h2>
        <p className="hint" style={{ marginTop: -8 }}>
          ამის გარეშე დაფა <b>სუფთა მოგებას არ აჩვენებს</b> — მოგება ქირისა და კომუნალურის
          გამოკლების გარეშე ტყუილი რიცხვია. შრომა ცვლებიდან ავტომატურად ითვლება.
        </p>
        <div className="field-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="field">
            <label htmlFor="rent">ქირა (₾)</label>
            <input id="rent" name="rent" type="number" step="0.01" min="0" defaultValue={n(fc.rent, 0)} />
          </div>
          <div className="field">
            <label htmlFor="utilities">კომუნალური (₾)</label>
            <input id="utilities" name="utilities" type="number" step="0.01" min="0" defaultValue={n(fc.utilities, 0)} />
          </div>
          <div className="field">
            <label htmlFor="other">სხვა (₾)</label>
            <input id="other" name="other" type="number" step="0.01" min="0" defaultValue={n(fc.other, 0)} />
            <span className="hint">ინტერნეტი, დაცვა, პროგრამები…</span>
          </div>
        </div>
        <p className="hint">
          თვიური თანხა პერიოდზე პროპორციულად გადაითვლება (30 დღე = სრული თვე).
        </p>
        <div className="form-actions">
          <button className="btn" type="submit">შენახვა</button>
        </div>
      </form>

      {/* ── გადასახადი ── */}`,
    );

    writeFileSync(P, p);
    console.log("✓ app/admin/settings/page.tsx");
  }
}

console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
