import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * POS PIN-ის ჰეშირება.
 *
 * აქ bcrypt განზრახ არ გამოიყენება: bcrypt ყოველ ჯერზე ახალ მარილს ურევს,
 * ანუ ერთი და იგივე PIN სხვადასხვა ჰეშს იძლევა. POS-ს კი ორივე სჭირდება —
 * 1) PIN-ით თანამშრომლის პოვნა (ერთი მოთხოვნით, არა ყველას შემოვლით)
 * 2) `posPinHash`-ის უნიკალურობა, რომ ორ თანამშრომელს ერთი PIN არ ჰქონდეს
 *
 * HMAC-SHA256 დეტერმინისტულია → ორივე მუშაობს. საიდუმლო (AUTH_SECRET) მხოლოდ
 * სერვერზეა, ანუ ბაზის ჰეშიდან PIN-ის აღდგენა შეუძლებელია.
 */
export function hashPin(pin: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET არ არის განსაზღვრული");
  return createHmac("sha256", secret).update(pin.trim()).digest("hex");
}

export function pinMatches(pin: string, hash: string): boolean {
  const a = Buffer.from(hashPin(pin), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 4–8 ციფრი. */
export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin.trim());
}
