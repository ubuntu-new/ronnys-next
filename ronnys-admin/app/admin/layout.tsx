import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/admin-auth";
import { logout } from "./actions";
import "./admin.css";

export const metadata: Metadata = {
  title: "Ronny's — Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "დაფა" },
  { href: "/admin/products", label: "პროდუქტები" },
  { href: "/admin/toppings", label: "ტოპინგები" },
  { href: "/admin/combos", label: "კომბოები" },
  { href: "/admin/branches", label: "ფილიალები" },
  { href: "/admin/settings", label: "პარამეტრები" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // login გვერდს საკუთარი layout აქვს — აქ shell არ ვახვევთ
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
          <main className="admin-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
