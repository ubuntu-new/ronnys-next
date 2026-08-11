// scripts/fix-transfer-status-export.mjs
//
// Next-ის გვერდის ფაილს მხოლოდ კონკრეტული ექსპორტების უფლება აქვს
// (default, metadata, dynamic, revalidate…). `export const STATUS` მათ შორის არ არის.
//
// გასწორება: STATUS/TONE ცალკე მოდულში გადადის და ორივე გვერდი იქიდან იღებს.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const DIR = "app/admin/stock/transfers";
const SHARED = `${DIR}/status.ts`;
const LIST = `${DIR}/page.tsx`;
const DETAIL = `${DIR}/[id]/page.tsx`;

for (const f of [LIST, DETAIL]) {
  if (!existsSync(f)) {
    console.error(`ვერ ვიპოვე ${f} — გაუშვი repo-ს root-იდან.`);
    process.exit(1);
  }
}

// ── 1) საერთო მოდული ──
if (existsSync(SHARED)) {
  console.log("status.ts უკვე არსებობს");
} else {
  writeFileSync(
    SHARED,
    `/** გადატანის სტატუსები — ცალკე ფაილში, რადგან Next-ის გვერდი
 *  თვითნებურ ექსპორტს არ უშვებს. */

export const STATUS: Record<string, string> = {
  draft: "მონახაზი",
  requested: "მოთხოვნილი",
  approved: "დამტკიცებული",
  sent: "გზაშია",
  received: "მიღებული",
  cancelled: "გაუქმებული",
};

export const TONE: Record<string, React.CSSProperties> = {
  requested: { background: "#fdf3d6", color: "#8a6a12" },
  approved: { background: "#e6eefc", color: "#1f4b99" },
  sent: { background: "#fdf3d6", color: "#8a6a12" },
  received: { background: "#e8f2e8", color: "#3f7d3f" },
  cancelled: { background: "#fdecea", color: "#b3261e" },
};
`,
  );
  console.log("✓ app/admin/stock/transfers/status.ts");
}

// ── 2) სია ──
{
  let s = readFileSync(LIST, "utf8");
  if (s.includes('from "./status"')) {
    console.log("page.tsx უკვე გასწორებულია");
  } else {
    copyFileSync(LIST, LIST + ".bak");

    // ლოკალური განსაზღვრებები ეშლება
    s = s.replace(/export const STATUS: Record<string, string> = \{[\s\S]*?\n\};\n\n/, "");
    s = s.replace(/const TONE: Record<string, React\.CSSProperties> = \{[\s\S]*?\n\};\n\n/, "");

    s = s.replace(
      'import { i18nText } from "@/lib/admin-utils";',
      'import { i18nText } from "@/lib/admin-utils";\nimport { STATUS, TONE } from "./status";',
    );

    if (!s.includes('from "./status"')) {
      console.error("⚠ ვერ ჩავამატე იმპორტი — ხელით შეამოწმე page.tsx");
      process.exit(1);
    }

    writeFileSync(LIST, s);
    console.log("✓ app/admin/stock/transfers/page.tsx");
  }
}

// ── 3) დეტალი ──
{
  let s = readFileSync(DETAIL, "utf8");
  if (s.includes('from "../status"')) {
    console.log("[id]/page.tsx უკვე გასწორებულია");
  } else {
    copyFileSync(DETAIL, DETAIL + ".bak");
    s = s.replace('import { STATUS } from "../page";', 'import { STATUS } from "../status";');

    if (!s.includes('from "../status"')) {
      console.error("⚠ ვერ ვიპოვე STATUS-ის იმპორტი — ხელით შეამოწმე [id]/page.tsx");
      process.exit(1);
    }

    writeFileSync(DETAIL, s);
    console.log("✓ app/admin/stock/transfers/[id]/page.tsx");
  }
}

console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
