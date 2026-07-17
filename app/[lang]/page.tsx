import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locales";
import ClientApp from "@/components/ClientApp";
import type { Lang } from "@/lib/data";

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <ClientApp lang={lang as Lang} />;
}
