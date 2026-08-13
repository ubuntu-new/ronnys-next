import "server-only";
import { db } from "@/lib/db";

/**
 * Admin interface language.
 *
 * English is the SOURCE language — every string in the code is written in
 * English and the dictionary below maps it to Georgian. This is deliberate:
 * a new screen written in English already works; forgetting to translate it
 * degrades to English rather than to a missing key.
 *
 * The language is a single setting, changed by super_admin only.
 */

export type AdminLang = "en" | "ka";

/** English → Georgian. Missing keys fall back to the English source. */
const KA: Record<string, string> = {
  // ── Navigation ──
  Dashboard: "დაფა",
  Orders: "შეკვეთები",
  Products: "პროდუქტები",
  Toppings: "ტოპინგები",
  Combos: "კომბოები",
  Availability: "ხელმისაწვდომობა",
  Categories: "კატეგორიები",
  Stock: "მარაგი",
  Transfers: "გადატანები",
  Production: "წარმოება",
  Costing: "თვითღირებულება",
  "Consumption rules": "ხარჯვის წესები",
  Branches: "ფილიალები",
  Staff: "თანამშრომლები",
  Discounts: "ფასდაკლებები",
  Settings: "პარამეტრები",
  "Activity log": "ჟურნალი",
  Archive: "არქივი",
  "Sign out": "გასვლა",

  // ── Common actions ──
  Save: "შენახვა",
  "Save all": "ყველას შენახვა",
  Cancel: "გაუქმება",
  Delete: "წაშლა",
  Edit: "რედაქტირება",
  Add: "დამატება",
  Create: "შექმნა",
  Back: "უკან",
  "Back to list": "← სია",
  All: "ყველა",
  Search: "ძებნა",
  Clear: "გასუფთავება",
  Yes: "დიახ",
  No: "არა",

  // ── Common labels ──
  Name: "დასახელება",
  Description: "აღწერა",
  Price: "ფასი",
  Quantity: "რაოდენობა",
  Unit: "ერთეული",
  Status: "სტატუსი",
  Active: "აქტიური",
  Enabled: "ჩართული",
  Disabled: "გამორთული",
  Category: "კატეგორია",
  Branch: "ფილიალი",
  Location: "ლოკაცია",
  Photo: "ფოტო",
  Note: "შენიშვნა",
  Total: "სულ",
  Date: "თარიღი",
  Time: "დრო",
  Who: "ვინ",
  Order: "რიგითობა",
  Size: "ზომა",
  Item: "ერთეული",
  Items: "ერთეული",
  Amount: "ოდენობა",
  Type: "ტიპი",
  Saved: "შენახულია",
  Warehouse: "საწარმო",
  "Central warehouse": "ცენტრალური საწარმო",

  // ── Dashboard ──
  Revenue: "ბრუნვა",
  "Average check": "საშუალო ჩეკი",
  "Gross profit": "მთლიანი მოგება",
  "Net profit": "სუფთა მოგება",
  Growth: "ზრდა",
  Delivery: "მიწოდება",
  Pickup: "წაღება",
  Economics: "ეკონომიკა",
  Ingredients: "ინგრედიენტები",
  Labour: "შრომა",
  "Prime cost": "Prime cost",
  "Fixed costs": "ფიქსირებული ხარჯები",
  Waste: "ჩამოწერა",
  "Stock count variance": "ინვენტარიზაციის სხვაობა",
  "Needs attention": "საჭიროებს ყურადღებას",
  "Hourly load": "საათობრივი დატვირთვა",
  "Top products": "ტოპ პროდუქტები",
  "Production yield": "წარმოების გამოსავალი",
  "Stock value": "მარაგის ღირებულება",
  "Low on stock": "ამოწურვის ზღვარზე",
  "Getting started": "დასაწყისი",
  Today: "დღეს",
  "24 hours": "24 საათი",
  days: "დღე",
  orders: "შეკვეთა",
  shifts: "ცვლა",
  hours: "სთ",
  batches: "პარტია",
  Planned: "დაგეგმილი",
  Actual: "ფაქტობრივი",
  Yield: "გამოსავალი",
  Peak: "პიკი",
  "per day": "დღეში",
  "previous period": "წინა პერიოდი",

  // ── Language ──
  Language: "ენა",
  English: "English",
  Georgian: "ქართული",
  "Interface language": "ინტერფეისის ენა",
};

let cache: { lang: AdminLang; at: number } | null = null;

/** Cached briefly — this runs on every admin page render. */
export async function getAdminLang(): Promise<AdminLang> {
  if (cache && Date.now() - cache.at < 30_000) return cache.lang;

  try {
    const row = await db.setting.findUnique({ where: { key: "adminLanguage" } });
    const v = (row?.value ?? {}) as Record<string, unknown>;
    const lang: AdminLang = v.lang === "ka" ? "ka" : "en";
    cache = { lang, at: Date.now() };
    return lang;
  } catch {
    return "en";
  }
}

export function clearLangCache() {
  cache = null;
}

/**
 * Translate. English text is the key; unknown keys return unchanged.
 *
 * Usage:  const t = await tr();  …  t("Products")
 */
export async function tr() {
  const lang = await getAdminLang();
  return (en: string): string => (lang === "ka" ? (KA[en] ?? en) : en);
}

/** Synchronous variant when the language is already known. */
export function trWith(lang: AdminLang) {
  return (en: string): string => (lang === "ka" ? (KA[en] ?? en) : en);
}
