// {en,ka} Json ველების და Decimal-ის დამხმარეები (admin-ისთვის)

export interface I18n {
  en: string;
  ka: string;
}

/** Prisma Json → {en,ka}, ნებისმიერი ფორმისგან დაცულად. */
export function i18nOf(v: unknown): I18n {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return { en: String(o.en ?? ""), ka: String(o.ka ?? o.en ?? "") };
  }
  return { en: "", ka: "" };
}

export function i18nText(v: unknown, lang: "en" | "ka" = "ka"): string {
  const t = i18nOf(v);
  return lang === "ka" ? t.ka || t.en : t.en || t.ka;
}

/** Decimal | number | null → number (UI-სთვის). */
export function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

export function money(v: unknown): string {
  return num(v).toFixed(2);
}

/** FormData-დან number, ცარიელი → null. */
export function fdNum(fd: FormData, key: string): number | null {
  const raw = String(fd.get(key) ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function fdStr(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export function fdBool(fd: FormData, key: string): boolean {
  return fd.get(key) === "on" || fd.get(key) === "true";
}
