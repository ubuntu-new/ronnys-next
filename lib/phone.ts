/**
 * Phone normalisation — the customer key.
 *
 * ⚠️ This matters more than it looks. Without it, `599123456`,
 * `+995 599 12 34 56` and `0599-12-34-56` become three different customers,
 * and within two months the база is full of duplicates that are painful to
 * merge. One person, one record — and the phone is what proves it.
 *
 * Stored form: E.164 without the plus (`995599123456`), so the unique index
 * does the enforcing.
 */

export function normalizePhone(raw: string): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;

  // 995 599 12 34 56 — already full international
  if (digits.length === 12 && digits.startsWith("995")) return digits;

  // 599123456 — local mobile
  if (digits.length === 9 && digits.startsWith("5")) return `995${digits}`;

  // 0599123456 — local with trunk zero
  if (digits.length === 10 && digits.startsWith("05")) return `995${digits.slice(1)}`;

  // 32 2 12 34 56 — Tbilisi landline
  if (digits.length === 9 && digits.startsWith("32")) return `995${digits}`;

  // anything else (foreign numbers) is kept as typed, digits only
  return digits.length >= 6 ? digits : null;
}

/** Display form: +995 599 12 34 56 */
export function formatPhone(stored: string): string {
  if (stored.length === 12 && stored.startsWith("995")) {
    const n = stored.slice(3);
    return `+995 ${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}`;
  }
  return `+${stored}`;
}

/** One line for a saved address. */
export function addressLine(a: {
  street: string;
  building?: string | null;
  apt?: string | null;
  entrance?: string | null;
  floor?: string | null;
}): string {
  return [
    a.street,
    a.building && `#${a.building}`,
    a.apt && `apt ${a.apt}`,
    a.entrance && `entr ${a.entrance}`,
    a.floor && `fl ${a.floor}`,
  ]
    .filter(Boolean)
    .join(", ");
}
