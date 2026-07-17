import type { MetadataRoute } from "next";
import { LOCALES, SITE_URL } from "@/lib/locales";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}`]));
  return LOCALES.map((l) => ({
    url: `${SITE_URL}/${l}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
    alternates: { languages },
  }));
}
