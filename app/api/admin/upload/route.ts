import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { getSession, can } from "@/lib/admin-auth";

// ⚠️ middleware /api-ს არ ფარავს — სესია აქ მოწმდება.
export const runtime = "nodejs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/var/www/ronnys/uploads";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!can(session, "can_edit_menu")) {
    return NextResponse.json({ error: "არ გაქვს უფლება" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ფაილი არ მოვიდა" }, { status: 400 });
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "დაშვებულია მხოლოდ JPG, PNG, WebP, AVIF, GIF" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "ფაილი 5 MB-ზე დიდია" }, { status: 400 });
  }

  // სახელი: <slug>-<random>.<ext> — გადაწერას გამორიცხავს
  const base = (form.get("name") ? String(form.get("name")) : file.name)
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "image";

  const filename = `${base}-${randomBytes(4).toString("hex")}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
