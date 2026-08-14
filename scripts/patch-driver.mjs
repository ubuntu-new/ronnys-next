// scripts/patch-driver.mjs
//
//  1. middleware — /driver ენის პრეფიქსის გარეშე
//  2. KDS API — კურიერის მიბმა
//  3. KDS დაფა — Ready სვეტში კურიერის არჩევა
//  4. admin/orders — ვინ წაიღო
//
// იდემპოტენტურია.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const skip = [];

// ── 1) middleware ──
{
  const F = "middleware.ts";
  let s = readFileSync(F, "utf8");

  if (s.includes('"/driver"') || s.includes("/driver/")) {
    skip.push("middleware");
  } else {
    copyFileSync(F, F + ".bak3");
    s = s.replace(
      '  if (pathname === "/pos" || pathname.startsWith("/pos/")) {\n    return NextResponse.next();\n  }',
      '  if (pathname === "/pos" || pathname.startsWith("/pos/")) {\n    return NextResponse.next();\n  }\n\n  // ── /driver — კურიერის ეკრანს ენის პრეფიქსი არ სჭირდება ──\n  if (pathname === "/driver" || pathname.startsWith("/driver/")) {\n    return NextResponse.next();\n  }',
    );
    if (!s.includes("/driver")) {
      console.error("⚠ ვერ ვიპოვე /pos-ის ბლოკი middleware-ში");
      process.exit(1);
    }
    writeFileSync(F, s);
    console.log("✓ middleware.ts");
  }
}

// ── 2) KDS API — მიბმა ──
{
  const F = "app/api/admin/kds/route.ts";
  let s = readFileSync(F, "utf8");

  if (s.includes("driverId")) {
    skip.push("kds/api");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      "  let body: { id?: string; status?: string };",
      "  let body: { id?: string; status?: string; driverId?: string };",
    );

    s = s.replace(
      `  const history = Array.isArray(order.statusHistory) ? (order.statusHistory as unknown[]) : [];

  await db.order.update({
    where: { id: body.id },
    data: {
      status: body.status as never,`,
      `  const history = Array.isArray(order.statusHistory) ? (order.statusHistory as unknown[]) : [];

  // ── driver assignment ──
  // Recorded with the status change, so "who took it" and "when" are one fact.
  const assign =
    body.status === "delivering" && body.driverId
      ? { driverId: body.driverId, assignedAt: new Date() }
      : {};

  await db.order.update({
    where: { id: body.id },
    data: {
      ...assign,
      status: body.status as never,`,
    );

    s = s.replace(
      "  const allowed = [\"confirmed\", \"preparing\", \"ready\", \"completed\"];",
      "  const allowed = [\"confirmed\", \"preparing\", \"ready\", \"delivering\", \"completed\"];",
    );

    // GET-ს ვამატებთ კურიერების სიას
    s = s.replace(
      `  return NextResponse.json({
    at: new Date().toISOString(),`,
      `  const drivers = await db.employee.findMany({
    where: { role: "driver", active: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    at: new Date().toISOString(),
    drivers,`,
    );

    writeFileSync(F, s);
    console.log("✓ app/api/admin/kds/route.ts");
  }
}

// ── 3) KDS დაფა ──
{
  const F = "app/admin/kds/KdsBoard.tsx";
  let s = readFileSync(F, "utf8");

  if (s.includes("drivers")) {
    skip.push("KdsBoard");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      "  const [muted, setMuted] = useState(false);",
      "  const [muted, setMuted] = useState(false);\n  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);",
    );

    s = s.replace(
      "        setOrders(list);\n        setError(null);",
      "        setOrders(list);\n        setDrivers(Array.isArray(data.drivers) ? data.drivers : []);\n        setError(null);",
    );

    s = s.replace(
      `  const move = async (id: string, status: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await fetch("/api/admin/kds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });`,
      `  const move = async (id: string, status: string, driverId?: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await fetch("/api/admin/kds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, driverId }),
      });`,
    );

    // Ready სვეტში კურიერის არჩევა
    s = s.replace(
      `                      {o.status === "ready" && (
                        <button type="button" className="kds-done" onClick={() => move(o.id, "completed")}>
                          Handed over
                        </button>
                      )}`,
      `                      {o.status === "ready" && o.type === "delivery" && drivers.length > 0 && (
                        <select
                          className="kds-driver"
                          defaultValue=""
                          onChange={(e) => e.target.value && move(o.id, "delivering", e.target.value)}
                        >
                          <option value="">Assign driver…</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      )}
                      {o.status === "ready" && (
                        <button type="button" className="kds-done" onClick={() => move(o.id, "completed")}>
                          Handed over
                        </button>
                      )}
                      {o.status === "delivering" && (
                        <button type="button" className="kds-done" onClick={() => move(o.id, "completed")}>
                          Delivered
                        </button>
                      )}`,
    );

    // delivering სვეტი
    s = s.replace(
      '    { key: "ready", title: "Ready", statuses: ["ready"] },',
      '    { key: "ready", title: "Ready", statuses: ["ready"] },\n    { key: "out", title: "Out for delivery", statuses: ["delivering"] },',
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/kds/KdsBoard.tsx");
  }
}

// ── 4) KDS სტილი ──
{
  const F = "app/admin/kds/kds.css";
  let css = readFileSync(F, "utf8");

  if (css.includes(".kds-driver")) {
    skip.push("kds.css");
  } else {
    css += `

/* driver assignment */
.kds-driver {
  width: 100%;
  padding: 11px;
  margin-bottom: 8px;
  font: inherit;
  font-size: 15px;
  border: 1px solid var(--a-line);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}
.kds-cols { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 1300px) { .kds-cols { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 700px) { .kds-cols { grid-template-columns: 1fr; } }
`;
    writeFileSync(F, css);
    console.log("✓ app/admin/kds/kds.css");
  }
}

// ── 5) admin/orders — ვინ წაიღო ──
{
  const F = "app/admin/orders/page.tsx";
  let s = readFileSync(F, "utf8");

  if (s.includes("driver:")) {
    skip.push("orders/page");
  } else {
    copyFileSync(F, F + ".bak");

    s = s.replace(
      "      include: { branch: true, _count: { select: { items: true } } },",
      "      include: { branch: true, driver: { select: { name: true } }, _count: { select: { items: true } } },",
    );

    s = s.replace(
      `                  <td>
                    <span className="hint">
                      {o.fulfillmentType === "pickup" ? "წაღება" : "მიწოდება"}
                    </span>
                  </td>`,
      `                  <td>
                    <span className="hint">
                      {o.fulfillmentType === "pickup" ? "წაღება" : "მიწოდება"}
                    </span>
                    {o.driver && <div className="hint">🛵 {o.driver.name}</div>}
                  </td>`,
    );

    writeFileSync(F, s);
    console.log("✓ app/admin/orders/page.tsx");
  }
}

if (skip.length) console.log(`\nუკვე დაპატჩილი: ${skip.join(", ")}`);
console.log("\nშემდეგი: npm run build && systemctl restart ronnys");
