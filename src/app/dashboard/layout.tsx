import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/LogoutButton";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/recommendations", label: "Recommendations" },
  { href: "/dashboard/featured-readers", label: "Featured Readers" },
  { href: "/dashboard/pipeline", label: "PO Pipeline" },
  { href: "/dashboard/hold-shelf", label: "Hold Shelf" },
  { href: "/dashboard/import", label: "Basil Import" },
];

const CATALOG_NAV = [
  { href: "/dashboard/customers", label: "Customers" },
  { href: "/dashboard/books", label: "Books" },
  { href: "/dashboard/authors", label: "Authors" },
];

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // Display-only — src/proxy.ts is what actually enforces sign-in and the
  // superadmin-only "Staff accounts" link below, not this layout (see the
  // Next.js auth guide's caution about relying on layouts for
  // authorization: they don't re-render on every navigation).
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <aside className="flex-none border-b border-stone-200 bg-white lg:w-56 lg:border-b-0 lg:border-r">
        <div className="px-5 py-4">
          <p className="text-sm font-semibold">Word on the Street</p>
          <p className="text-xs text-stone-500">Back office</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-1 lg:flex-col lg:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="hidden px-6 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-stone-400 lg:block">
          Catalog
        </p>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {CATALOG_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {user?.role === "superadmin" && (
          <>
            <p className="hidden px-6 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-stone-400 lg:block">
              Admin
            </p>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
              <Link
                href="/dashboard/users"
                className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              >
                Staff accounts
              </Link>
            </nav>
          </>
        )}
        <div className="hidden px-3 pb-2 lg:block">
          <Link href="/register" className="text-xs text-stone-400 underline">
            ← Open register view
          </Link>
        </div>
        {user && (
          <div className="flex items-center justify-between gap-2 border-t border-stone-100 px-5 py-3 text-xs text-stone-500">
            <span className="truncate">{user.email}</span>
            <LogoutButton className="flex-none font-medium underline" />
          </div>
        )}
      </aside>
      <main className="min-w-0 flex-1 bg-stone-50 p-4 sm:p-6">{children}</main>
    </div>
  );
}
