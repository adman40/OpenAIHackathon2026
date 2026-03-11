"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../../components/shared/NavBar";
import SummaryCard from "../../components/shared/SummaryCard";
import { DEMO_PROFILE, useProfile } from "../../lib/profile-context";

const summaryCards = [
  {
    title: "Academic",
    subtitle: "Prerequisite watchlist and next-semester recommendations.",
    metric: "3 priority actions",
    status: "On track",
    actionHref: "/academic",
    actionLabel: "Open planner",
  },
  {
    title: "Scholarships",
    subtitle: "High-fit awards ranked by urgency and student profile match.",
    metric: "$8.4k matched",
    status: "2 urgent",
    actionHref: "/scholarships",
    actionLabel: "View awards",
  },
  {
    title: "Research",
    subtitle: "Labs and faculty opportunities aligned to skills and goals.",
    metric: "4 strong fits",
    status: "New",
    actionHref: "/research",
    actionLabel: "Explore roles",
  },
  {
    title: "Internships",
    subtitle: "Career opportunities filtered to preferred term and location.",
    metric: "6 shortlist items",
    status: "Recommended",
    actionHref: "/internships",
    actionLabel: "See matches",
  },
  {
    title: "Clubs",
    subtitle: "Communities that reinforce academic, social, and career goals.",
    metric: "5 good-fit orgs",
    status: "Balanced",
    actionHref: "/clubs",
    actionLabel: "Browse clubs",
  },
];

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f5f5f4_55%,#f0fdf4_100%)] px-4 py-6 text-stone-900 md:px-8">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-28 rounded-[28px] bg-white/80" />
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-6">
            <div className="h-40 rounded-[32px] bg-white/80" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-52 rounded-[28px] bg-white/80" />
              ))}
            </div>
          </div>
          <div className="h-[520px] rounded-[32px] bg-white/80" />
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { profile, setProfile, isHydrated } = useProfile();

  useEffect(() => {
    if (!isHydrated) return;

    if (!profile) {
      router.replace("/onboarding");
    }
  }, [isHydrated, profile, router]);

  if (!isHydrated || !profile) {
    return <DashboardSkeleton />;
  }

  const firstName = profile.name.split(" ")[0] ?? profile.name;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f5f5f4_55%,#f0fdf4_100%)] px-4 py-6 text-stone-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-24">
        <NavBar />

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-[32px] bg-gradient-to-br from-stone-950 via-orange-900 to-orange-700 p-8 text-white shadow-[0_24px_70px_rgba(28,25,23,0.18)] md:p-10">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-100/80">
                    Dashboard
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                    {`Welcome back, ${firstName}.`}
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-orange-50/90 md:text-base">
                    Hook is using your {profile.major} profile to organize academic planning,
                    funding, opportunities, communities, and support into one clear command
                    center.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-orange-100/70">
                      Current semester
                    </p>
                    <p className="mt-2 text-lg font-semibold">{profile.currentSemester}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-orange-100/70">
                      Career goal
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {profile.careerGoal.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {summaryCards.map((card) => (
                <SummaryCard key={card.title} {...card} />
              ))}
            </div>
          </section>

          <aside className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_18px_50px_rgba(28,25,23,0.08)] md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                  Hook Chat
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-stone-900">Action panel</h3>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                Placeholder
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-stone-600">
              This panel will host the profile-aware assistant. For the dashboard shell, it
              previews the judge story: academic guidance, scholarship prioritization, outreach
              drafts, and campus-resource routing from one assistant surface.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-3xl bg-stone-100 p-4 text-sm leading-6 text-stone-600">
                “What should I prioritize this week if I want research experience and more aid?”
              </div>
              <div className="rounded-3xl bg-orange-50 p-4 text-sm leading-6 text-stone-700">
                Hook will soon respond with ranked actions, draft help, and source-backed next
                steps based on this profile.
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-dashed border-stone-300 bg-stone-50 p-5">
              <p className="text-sm font-semibold text-stone-900">Planned launch sequence</p>
              <ul className="mt-4 space-y-3 text-sm text-stone-600">
                <li>Academic and opportunity alerts land here first.</li>
                <li>Suggested actions will deep-link into each product area.</li>
                <li>Campus support routing will appear as citation-backed guidance.</li>
              </ul>
            </div>
          </aside>
        </div>

        <button
          type="button"
          onClick={() => setProfile(DEMO_PROFILE)}
          className="fixed bottom-6 right-6 rounded-full bg-orange-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(194,65,12,0.35)] transition hover:bg-orange-800"
        >
          Demo Mode
        </button>
      </div>
    </main>
  );
}
