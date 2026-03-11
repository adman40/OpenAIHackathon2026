"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/academic", label: "Academic" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/research", label: "Research" },
  { href: "/internships", label: "Internships" },
  { href: "/clubs", label: "Clubs" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="rounded-[28px] border border-stone-200 bg-white/95 p-4 shadow-[0_18px_50px_rgba(28,25,23,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
            Hook Platform
          </p>
          <h1 className="mt-1 text-xl font-semibold text-stone-900">Student admin co-pilot</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-orange-700 text-white"
                    : "border border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-300 hover:text-orange-700",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
