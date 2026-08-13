// scripts/patch-admin-language.mjs
//
//  1. settings action — ენის შენახვა (მხოლოდ super_admin)
//  2. settings page — ენის ამრჩევი
//  3. admin.css — დამხმარე ბლოკისა და ჩეკლისტის სტილი
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) action ──
{
  const F = "app/admin/settings/actions.ts";
  if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }
  let s = readFileSync(F, "utf8");

  if (s.includes("saveAdminLanguage")) {
    skip.push("actions");
  } else {
    copyFileSync(F, F + ".bak");

    if (!s.includes("clearLangCache")) {
      s = s.replace(
        'import { db } from "@/lib/db";',
        'import { db } from "@/lib/db";\nimport { clearLangCache } from "@/lib/admin-i18n";\nimport { getSession } from "@/lib/admin-auth";',
      );
    }

    s += `
/** ინტერფეისის ენა — მხოლოდ super_admin ცვლის. */
export async function saveAdminLanguage(fd: FormData) {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    throw new Error("Only a super admin can change the interface language");
  }

  const lang = fdStr(fd, "lang") === "ka" ? "ka" : "en";
  await put("adminLanguage", { lang }, session.sub);
  clearLangCache();

  redirect("/admin/settings?saved=language");
}
`;
    writeFileSync(F, s);
    console.log("✓ app/admin/settings/actions.ts");
  }
}

// ── 2) page ──
{
  const F = "app/admin/settings/page.tsx";
  let p = readFileSync(F, "utf8");

  if (p.includes("saveAdminLanguage")) {
    skip.push("settings/page");
  } else {
    copyFileSync(F, F + ".bak");

    // იმპორტი — ბოლო ელემენტის შემდეგ, ღუზის მიუხედავად
    const m = p.match(/(\n\s*)(\w+),(\s*\n\} from "\.\/actions";)/);
    if (!m) {
      console.error("⚠ ვერ ვიპოვე actions-ის იმპორტი");
      process.exit(1);
    }
    p = p.replace(m[0], `${m[1]}${m[2]},${m[1]}saveAdminLanguage,${m[3]}`);

    // სესია — უფლების შესამოწმებლად
    if (!p.includes("getSession")) {
      p = p.replace('import { db } from "@/lib/db";', 'import { db } from "@/lib/db";\nimport { getSession } from "@/lib/admin-auth";');
    }
    p = p.replace("  const rows = await db.setting.findMany();", "  const session = await getSession();\n  const lang = obj(map.adminLanguage);\n  const rows = await db.setting.findMany();");

    // map-ის შემდეგ უნდა იყოს — გადავიტანოთ
    p = p.replace("  const session = await getSession();\n  const lang = obj(map.adminLanguage);\n  const rows = await db.setting.findMany();", "  const session = await getSession();\n  const rows = await db.setting.findMany();");
    p = p.replace("  const order = obj(map.order);", "  const lang = obj(map.adminLanguage);\n  const order = obj(map.order);");

    const block = `      {/* language */}
      <form className="admin-panel admin-form" action={saveAdminLanguage} style={{ maxWidth: "none" }}>
        <h2>Interface language</h2>
        {session?.role === "super_admin" ? (
          <>
            <p className="hint" style={{ marginTop: -8 }}>
              English is the source language — new screens appear in English first.
              Changing this affects every admin user.
            </p>
            <div className="field" style={{ maxWidth: 320 }}>
              <label htmlFor="lang">Language</label>
              <select id="lang" name="lang" defaultValue={String(lang.lang ?? "en")}>
                <option value="en">English</option>
                <option value="ka">ქართული</option>
              </select>
            </div>
            <div className="form-actions">
              <button className="btn" type="submit">Save</button>
            </div>
          </>
        ) : (
          <p className="hint" style={{ margin: 0 }}>
            Current: <b>{String(lang.lang ?? "en") === "ka" ? "ქართული" : "English"}</b> — only a
            super admin can change this.
          </p>
        )}
      </form>

`;

    const anchor = p.includes("      {/* ── შეკვეთა ── */}")
      ? "      {/* ── შეკვეთა ── */}"
      : p.match(/\n(\s*\{\/\* ─* [^\n]*\*\/\})/)?.[1];

    if (!anchor) {
      console.error("⚠ ვერ ვიპოვე ჩასასმელი ადგილი settings/page.tsx-ში");
      process.exit(1);
    }
    p = p.replace(anchor, block + anchor);

    writeFileSync(F, p);
    console.log("✓ app/admin/settings/page.tsx");
  }
}

// ── 3) სტილი ──
{
  const F = "app/admin/admin.css";
  let css = readFileSync(F, "utf8");

  if (css.includes(".help-note")) {
    skip.push("admin.css");
  } else {
    css += `

/* ── contextual help ── */
.help-note { margin: 10px 0 0; }
.help-note > button {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  font-size: 13px;
  color: var(--a-orange);
  cursor: pointer;
}
.help-note-body {
  margin-top: 8px;
  padding: 12px 14px;
  background: #fdfcfa;
  border: 1px solid var(--a-line);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--a-muted);
}
.help-note-body ul { margin: 0; padding-left: 20px; }

/* ── setup checklist ── */
.setup-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid var(--a-line);
}
.setup-step:last-child { border-bottom: 0; }
.setup-mark {
  flex: 0 0 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
}
.setup-mark-done { background: #e8f2e8; color: var(--a-ok); }
.setup-mark-todo { background: #fdf3d6; color: #8a6a12; }
.setup-mark-block { background: #fdecea; color: var(--a-danger); }
.setup-step-body { flex: 1; min-width: 0; }
.setup-step-body b { display: block; font-size: 14px; }
.setup-step-body span { font-size: 13px; color: var(--a-muted); }
.setup-step-body a { font-size: 13px; }
.setup-progress {
  height: 8px;
  background: #f0efed;
  border-radius: 4px;
  overflow: hidden;
  margin: 10px 0 16px;
}
.setup-progress > div { height: 100%; background: var(--a-ok); }
`;
    writeFileSync(F, css);
    console.log("✓ app/admin/admin.css");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
