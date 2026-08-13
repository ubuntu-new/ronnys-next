// scripts/patch-dashboard-en.mjs
//
// დაფის თარგმნა ინგლისურად + ჩეკლისტის ჩასმა.
//
// ტექსტი ჩანაცვლდება ზუსტი დამთხვევით — თუ რომელიმე ვერ მოიძებნა,
// სკრიპტი ამბობს რომელი და აგრძელებს. ნაწილობრივი თარგმანი უკეთესია,
// ვიდრე გატეხილი გვერდი.
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const F = "app/admin/page.tsx";
if (!existsSync(F)) { console.error(`ვერ ვიპოვე ${F}`); process.exit(1); }

let s = readFileSync(F, "utf8");

if (s.includes("SetupChecklist")) {
  console.log("უკვე დაპატჩილია.");
  process.exit(0);
}

copyFileSync(F, F + ".bak");

// ── იმპორტები ──
s = s.replace(
  'import { fmtQty } from "@/lib/stock";',
  'import { fmtQty } from "@/lib/stock";\nimport { setupChecklist } from "@/lib/setup-checklist";\nimport SetupChecklist from "./_components/SetupChecklist";\nimport HelpNote from "./_components/HelpNote";',
);

// ── ჩეკლისტის მონაცემი ──
s = s.replace(
  "      db.order.count({ where: { status: \"new\" } }),\n    ]);",
  "      db.order.count({ where: { status: \"new\" } }),\n      setupChecklist(),\n    ]);",
);
s = s.replace(
  "const [session, core, costs, labour, products, branches, load, yieldStats, stock, fixed, pending] =",
  "const [session, core, costs, labour, products, branches, load, yieldStats, stock, fixed, pending, setup] =",
);

// ── ჩეკლისტი „საჭიროებს ყურადღებას"-ის შემდეგ ──
s = s.replace(
  "      {noData ? (",
  "      {setup.done < setup.total && (\n        <SetupChecklist steps={setup.steps} done={setup.done} total={setup.total} />\n      )}\n\n      {noData ? (",
);

// ── თარგმანი ──
const T = [
  ["<h1>დაფა</h1>", "<h1>Dashboard</h1>"],
  ["ბოლო {p.label}", "last {p.label}"],
  ['{d === 1 ? "დღეს" : `${d} დღე`}', '{d === 1 ? "Today" : `${d} days`}'],
  ["<h2>საჭიროებს ყურადღებას</h2>", "<h2>Needs attention</h2>"],
  ["{pending} დაუმუშავებელი შეკვეთა", "{pending} new orders"],
  ["⚠️ {stock.low} ერთეული ამოწურვის ზღვარზე", "⚠️ {stock.low} items low on stock"],
  ["<h2>ამ პერიოდში შეკვეთა არ ყოფილა</h2>", "<h2>No orders in this period</h2>"],
  [
    "აირჩიე უფრო გრძელი პერიოდი, ან დაელოდე პირველ შეკვეთებს. დაფა კვირებში\n            ხდება სასარგებლო — ერთი დღის ციფრი ტენდენციას ვერ აჩვენებს.",
    "Pick a longer period, or wait for the first orders. This page becomes useful\n            over weeks — a single day shows no trend.",
  ],
  ['label="ბრუნვა" sub={`${money(core.perDay)} ₾ / დღე`}', 'label="Revenue" sub={`${money(core.perDay)} ₾ / day`}'],
  ['label="შეკვეთა" sub={`წინა პერიოდი: ${core.prevCount}`}', 'label="Orders" sub={`previous: ${core.prevCount}`}'],
  ['label="საშუალო ჩეკი"', 'label="Average check"'],
  ['label="მთლიანი მოგება"', 'label="Gross profit"'],
  ['sub="ინგრედიენტების გამოკლებით"', 'sub="after ingredients"'],
  ['label="მიწოდება" sub="დანარჩენი — წაღება"', 'label="Delivery" sub="rest is pickup"'],
  ['label="ზრდა"', 'label="Growth"'],
  ["sub={`წინა ${p.label}-თან`}", "sub={`vs previous ${p.label}`}"],
  ["<h2>ეკონომიკა</h2>", "<h2>Economics</h2>"],
  ["<td style={{ width: 260 }}>ბრუნვა</td>", "<td style={{ width: 260 }}>Revenue</td>"],
  ["<td>ინგრედიენტები (COGS)</td>", "<td>Ingredients (COGS)</td>"],
  ["<span className=\"hint\"> · ნორმა 28–33%</span>", "<span className=\"hint\"> · target 28–33%</span>"],
  ["<td>შრომა</td>", "<td>Labour</td>"],
  ["{labour.hours} სთ, {labour.shifts} ცვლა", "{labour.hours} h, {labour.shifts} shifts"],
  ["` · ${labour.unpriced} ცვლას განაკვეთი აკლია`", "` · ${labour.unpriced} shifts without a rate`"],
  ["<span className=\"hint\"> · ჯანსაღი რესტორანი ≤ 65%</span>", "<span className=\"hint\"> · healthy ≤ 65%</span>"],
  ["<td>ჩამოწერა (გაფუჭდა)</td>", "<td>Waste</td>"],
  ["% ბრუნვისა", "% of revenue"],
  ["<td>ინვენტარიზაციის სხვაობა</td>", "<td>Stock count variance</td>"],
  [
    '"დანაკლისი — გადაჭარბებული პორცია, გაფუჭება ან ქურდობა"',
    '"Shortage — over-portioning, spoilage or theft"',
  ],
  ['"ნამეტი — დათვლის შეცდომა ან აღურიცხავი მიღება"', '"Surplus — a counting error or an unrecorded receipt"'],
  ["<td>ფიქსირებული ხარჯი</td>", "<td>Fixed costs</td>"],
  ["₾/თვე პროპორციულად", "₾/month, pro-rated"],
  ["<b>სუფთა მოგება</b>", "<b>Net profit</b>"],
  [
    "სუფთა მოგება არ ჩანს — ქირა და კომუნალური არ არის შეყვანილი.{\" \"}",
    "Net profit is hidden — rent and utilities haven't been entered.{\" \"}",
  ],
  ["დაამატე პარამეტრებში →", "Add them in Settings →"],
  ["<b>ინგრედიენტების ღირებულება ნულია.</b> ან ხარჯვის წესები არ არის, ან მიღებებს\n                ფასი აკლია.", "<b>Ingredient cost is zero.</b> Either consumption rules are missing, or receipts have no price."],
  ["შეავსე წესები →", "Fill in the rules →"],
  ["<h2>ფილიალები</h2>", "<h2>Branches</h2>"],
  ["<th>ფილიალი</th>", "<th>Branch</th>"],
  ['<th style={{ width: 90 }}>შეკვეთა</th>', '<th style={{ width: 90 }}>Orders</th>'],
  ['<th style={{ width: 130 }}>ბრუნვა</th>', '<th style={{ width: 130 }}>Revenue</th>'],
  ['<th style={{ width: 120 }}>საშ. ჩეკი</th>', '<th style={{ width: 120 }}>Avg check</th>'],
  ["<h2>საათობრივი დატვირთვა</h2>", "<h2>Hourly load</h2>"],
  ["პიკი <b>{load.peak.hour}:00</b> — {load.peak.count} შეკვეთა. ცვლების გრაფიკი ამ\n              რიცხვებს უნდა მიჰყვებოდეს.", "Peak at <b>{load.peak.hour}:00</b> — {load.peak.count} orders. Staff rotas should follow this shape."],
  ["<h2>ტოპ პროდუქტები</h2>", "<h2>Top products</h2>"],
  ["<th>პროდუქტი</th>", "<th>Product</th>"],
  ['<th style={{ width: 90 }}>ცალი</th>', '<th style={{ width: 90 }}>Qty</th>'],
  ["⚠️ ყველაზე გაყიდვადი ხშირად ყველაზე ნაკლებმომგებიანია —{\" \"}", "⚠️ The best seller is often the least profitable —{\" \"}"],
  ["ნახე მოგება პროდუქტზე →", "see margin per product →"],
  ["<h2>წარმოების გამოსავალი</h2>", "<h2>Production yield</h2>"],
  ['label="პარტია"', 'label="Batches"'],
  ['label="დაგეგმილი"', 'label="Planned"'],
  ['label="ფაქტობრივი"', 'label="Actual"'],
  ['label="გამოსავალი"', 'label="Yield"'],
  ['sub={yieldStats.pct! < 95 ? "რეცეპტი ან დანაკარგი" : undefined}', 'sub={yieldStats.pct! < 95 ? "recipe drift or loss" : undefined}'],
  ["<h2>მარაგი</h2>", "<h2>Stock</h2>"],
  ['label="მარაგის ღირებულება"', 'label="Stock value"'],
  ['label="ამოწურვის ზღვარზე"', 'label="Low on stock"'],
  ["<h2>რას ნიშნავს ეს რიცხვები</h2>", "<h2>What these numbers mean</h2>"],
  [
    "<b>Food cost 28–33%</b> — რესტორნის ნორმა. თუ მაღალია, ან ფასი დაბალია, ან პორცია\n            დიდი, ან დანაკარგია.",
    "<b>Food cost 28–33%</b> — the restaurant norm. Higher means prices are low, portions are large, or something is being lost.",
  ],
  [
    "<b>Prime cost ≤ 65%</b> — ინგრედიენტები + შრომა. ეს ერთი რიცხვი ყველაზე მეტს ამბობს\n            რესტორნის ჯანმრთელობაზე.",
    "<b>Prime cost ≤ 65%</b> — ingredients plus labour. This single number says more about a restaurant's health than revenue does.",
  ],
  [
    "<b>ინვენტარიზაციის სხვაობა</b> — ის, რაც ჩუმად ჭამს მოგებას. ბრუნვა ყველამ იცის;\n            ეს რიცხვი — არავინ.",
    "<b>Stock count variance</b> — what quietly eats the profit. Everyone watches revenue; almost nobody watches this.",
  ],
  [
    "<b>მთლიანი მოგება ≠ სუფთა მოგება.</b> აქ არ შედის საბანკო საკომისიო, გადასახადები\n            და ამორტიზაცია — რეალური მოგება ამაზე დაბალია.",
    "<b>Gross profit is not net profit.</b> Bank fees, taxes and depreciation are not included — the real figure is lower.",
  ],
];

let hit = 0;
const missed = [];
for (const [from, to] of T) {
  if (s.includes(from)) {
    s = s.split(from).join(to);
    hit++;
  } else {
    missed.push(from.slice(0, 40));
  }
}

writeFileSync(F, s);
console.log(`✓ app/admin/page.tsx — ${hit}/${T.length} ტექსტი ითარგმნა`);
if (missed.length) {
  console.log(`  ვერ მოიძებნა ${missed.length}:`);
  for (const m of missed.slice(0, 5)) console.log(`   · ${m}…`);
}
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
