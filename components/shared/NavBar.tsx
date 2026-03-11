"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { getProfileFirstName } from "../../lib/profile-utils";
import { useProfile } from "../../lib/profile-context";

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
  const router = useRouter();
  const { clearProfile, profile } = useProfile();

  const handleSignOut = () => {
    void clearProfile();
    router.push("/onboarding");
  };

  return (
    <nav className="rounded-[28px] border border-stone-200 bg-white/95 p-4 shadow-[0_18px_50px_rgba(28,25,23,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/dashboard" className="block">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
            Hook Platform
          </p>
          <h1 className="mt-1 text-xl font-semibold text-stone-900">
            {profile ? `Home for ${getProfileFirstName(profile)}` : "Student admin co-pilot"}
          </h1>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
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

          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-orange-300 hover:text-orange-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
