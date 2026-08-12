// scripts/telegram-low-stock.mjs
//
// მარაგის დღიური შეჯამება Telegram-ში.
// cron-ით ეშვება — რეალურ დროში გაგზავნა ხმაური იქნებოდა.
//
// გაშვება:  npx tsx scripts/telegram-low-stock.mjs

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.log("TELEGRAM_BOT_TOKEN არ არის — გამოტოვდა");
  process.exit(0);
}

const row = await db.setting.findUnique({ where: { key: "telegram" } });
const cfg = row?.value ?? {};
if (!cfg.enabled || !cfg.chatId || cfg.events?.lowStock === false) {
  console.log("Telegram გამორთულია ან lowStock არ არის მონიშნული");
  process.exit(0);
}

const levels = await db.stockLevel.findMany({
  where: { minLevel: { not: null } },
  include: { item: true, location: true },
});

const low = levels.filter((l) => Number(l.qty) <= Number(l.minLevel) && l.item.active && !l.item.deletedAt);

if (low.length === 0) {
  console.log("ყველაფერი მინიმუმზე მაღლაა");
  process.exit(0);
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nm = (j) => String(j?.ka ?? j?.en ?? "");

const lines = low.slice(0, 20).map((l) => {
  const need = l.targetLevel != null ? Math.max(0, Number(l.targetLevel) - Number(l.qty)) : null;
  return `• ${esc(nm(l.item.name))} — ${esc(nm(l.location.name))}: ${Number(l.qty)} ${l.item.unit}` +
    (need ? ` (საჭიროა +${Math.round(need * 1000) / 1000})` : "");
});
const more = low.length > 20 ? `\n<i>…და კიდევ ${low.length - 20}</i>` : "";

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: cfg.chatId,
    text: `⚠️ <b>მარაგი ამოწურვის ზღვარზე</b> (${low.length})\n\n${lines.join("\n")}${more}`,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  }),
});

console.log(res.ok ? `✓ გაიგზავნა (${low.length} ერთეული)` : `✗ ${res.status}`);

await db.$disconnect();
