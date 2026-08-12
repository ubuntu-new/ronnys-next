import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/admin-auth";
import { logout } from "./actions";
import AdminSearch from "./_components/AdminSearch";
import AlertBell from "./_components/AlertBell";
import "./admin.css";

export const metadata: Metadata = {
  title: "Ronny's — Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "დაფა" },
  { href: "/admin/orders", label: "შეკვეთები" },
  { href: "/admin/products", label: "პროდუქტები" },
  { href: "/admin/toppings", label: "ტოპინგები" },
  { href: "/admin/combos", label: "კომბოები" },
  { href: "/admin/availability", label: "ხელმისაწვდომობა" },
  { href: "/admin/categories", label: "კატეგორიები" },
  { href: "/admin/stock", label: "მარაგი" },
  { href: "/admin/stock/transfers", label: "გადატანები" },
  { href: "/admin/stock/production", label: "წარმოება" },
  { href: "/admin/stock/costing", label: "თვითღირებულება" },
  { href: "/admin/stock/consumption", label: "ხარჯვის წესები" },
  { href: "/admin/branches", label: "ფილიალები" },
  { href: "/admin/employees", label: "თანამშრომლები" },
  { href: "/admin/discounts", label: "ფასდაკლებები" },
  { href: "/admin/settings", label: "პარამეტრები" },
  { href: "/admin/audit", label: "ჟურნალი" },
  { href: "/admin/archive", label: "არქივი" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    return (
      <html lang="ka">
        <body className="admin-body">{children}</body>
      </html>
    );
  }

  return (
    <html lang="ka">
      <body className="admin-body">
        <div className="admin-shell">
          <aside className="admin-side">
            <div className="admin-brand">
              Ronny&apos;s <span>Admin</span>
              <AlertBell />
            </div>
            <nav className="admin-nav">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="admin-side-foot">
              {session.name}
              <br />
              <small>{session.role}</small>
              <form action={logout}>
                <button type="submit">გასვლა</button>
              </form>
            </div>
          </aside>
          <main className="admin-main">
            <Suspense fallback={null}>
              <AdminSearch />
            </Suspense>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
