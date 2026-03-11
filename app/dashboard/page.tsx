"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ChatWindow from "../../components/chat/ChatWindow";
import NavBar from "../../components/shared/NavBar";
import SummaryCard from "../../components/shared/SummaryCard";
import {
  academicDemoFallback,
  clubsDemoFallback,
  internshipsDemoFallback,
  researchDemoFallback,
  scholarshipsDemoFallback,
} from "../../lib/demo-fallbacks";
import { DEMO_PROFILE, useProfile } from "../../lib/profile-context";
import { getProfileFirstName } from "../../lib/profile-utils";
import { toRequestSafeProfile } from "../../lib/request-safe-profile";
import type {
  AcademicAnalysis,
  ClubMatch,
  OpportunityMatch,
  ScholarshipMatch,
  StudentProfile,
} from "../../lib/types";

const DEMO_STATIC = process.env.NEXT_PUBLIC_DEMO_STATIC === "true";

type ServiceKey = "academic" | "scholarships" | "research" | "internships" | "clubs";

type DashboardCardData = {
  title: string;
  subtitle: string;
  metric: string;
  status: string;
  actionHref: string;
  actionLabel: string;
};

type DashboardState = {
  cards: DashboardCardData[];
  fallbackSources: ServiceKey[];
  academicPercentComplete: number;
};

type ApiErrorResponse = {
  error: string;
};

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f5f5f4_55%,#f0fdf4_100%)] px-4 py-6 text-stone-900 md:px-8">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6 pb-16">
        <div className="h-28 rounded-[28px] bg-white/80" />
        <div className="h-44 rounded-[32px] bg-white/80" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-56 rounded-[28px] bg-white/80" />
          ))}
        </div>
        <div className="h-[620px] rounded-[32px] bg-white/80" />
      </div>
    </main>
  );
}

function formatMoney(amount: number) {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }

  return `$${amount}`;
}

function formatDate(isoDate: string | null) {
  if (!isoDate) {
    return null;
  }

  const parsedDate = new Date(`${isoDate}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsedDate);
}

function buildAcademicCard(analysis: AcademicAnalysis): DashboardCardData {
  const nextCourse =
    analysis.majorRecommendations[0]?.courseId ?? analysis.coreRecommendations[0]?.courseId;
  const prereqCount = analysis.prereqAlerts.length;

  return {
    title: "Academic",
    subtitle:
      prereqCount > 0
        ? analysis.prereqAlerts[0]
        : nextCourse
          ? `${analysis.summary} Next best move: ${nextCourse}.`
          : analysis.summary,
    metric: `${analysis.percentComplete}% complete`,
    status: prereqCount > 0 ? `${prereqCount} alert${prereqCount === 1 ? "" : "s"}` : "On track",
    actionHref: "/academic",
    actionLabel: "Open planner",
  };
}

function buildScholarshipsCard(response: { matches: ScholarshipMatch[] }): DashboardCardData {
  const topMatch =
    response.matches.find((match) => match.scholarship.amount > 0) ?? response.matches[0];
  const urgentCount = response.matches.filter((match) => match.isUrgent).length;

  if (!topMatch) {
    return {
      title: "Scholarships",
      subtitle: "No scholarship matches returned for this profile yet.",
      metric: "0 matches",
      status: "Empty",
      actionHref: "/scholarships",
      actionLabel: "View awards",
    };
  }

  const formattedDeadline = formatDate(topMatch.deadline);

  return {
    title: "Scholarships",
    subtitle: formattedDeadline
      ? `${topMatch.scholarship.name} leads with ${topMatch.fitScore} fit and a ${formattedDeadline} deadline.`
      : `${topMatch.scholarship.name} leads with ${topMatch.fitScore} fit.`,
    metric:
      topMatch.scholarship.amount > 0
        ? `${formatMoney(topMatch.scholarship.amount)} top award`
        : "Amount varies",
    status: urgentCount > 0 ? `${urgentCount} urgent` : `${response.matches.length} ranked`,
    actionHref: "/scholarships",
    actionLabel: "View awards",
  };
}

function buildOpportunityCard(
  title: "Research" | "Internships",
  matches: OpportunityMatch[],
  actionHref: string,
  actionLabel: string,
): DashboardCardData {
  const topMatch = matches[0];

  if (!topMatch) {
    return {
      title,
      subtitle: `No ${title.toLowerCase()} matches returned for this profile yet.`,
      metric: "0 matches",
      status: "Empty",
      actionHref,
      actionLabel,
    };
  }

  const urgentCount = matches.filter((match) => {
    const deadline = new Date(`${match.opportunity.applyBy}T00:00:00`).getTime();
    const daysUntil = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
    return Number.isFinite(daysUntil) && daysUntil <= 14;
  }).length;

  return {
    title,
    subtitle: `${topMatch.opportunity.title} at ${topMatch.opportunity.organization} is the top ${title.toLowerCase()} fit.`,
    metric: `${matches.length} ranked`,
    status: urgentCount > 0 ? `${urgentCount} urgent` : `${topMatch.fitScore} fit`,
    actionHref,
    actionLabel,
  };
}

function buildClubsCard(matches: ClubMatch[]): DashboardCardData {
  const topMatch = matches[0];

  if (!topMatch) {
    return {
      title: "Clubs",
      subtitle: "No club matches returned for this profile yet.",
      metric: "0 matches",
      status: "Empty",
      actionHref: "/clubs",
      actionLabel: "Browse clubs",
    };
  }

  return {
    title: "Clubs",
    subtitle: `${topMatch.club.name} stands out for ${topMatch.club.category.toLowerCase()} and schedule fit.`,
    metric: `${matches.length} matches`,
    status: `${topMatch.fitScore} fit`,
    actionHref: "/clubs",
    actionLabel: "Browse clubs",
  };
}

async function postJson<T extends object>(
  url: string,
  profile: StudentProfile,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: toRequestSafeProfile(profile) }),
  });

  const rawPayload = await response.text();
  let payload: T | ApiErrorResponse;

  try {
    payload = (rawPayload ? JSON.parse(rawPayload) : {}) as T | ApiErrorResponse;
  } catch {
    throw new Error(rawPayload || `Request failed with status ${response.status}`);
  }

  if (!response.ok) {
    throw new Error("error" in payload ? payload.error : `Request failed with status ${response.status}`);
  }

  return payload as T;
}

async function loadDashboardState(profile: StudentProfile, preferStatic: boolean): Promise<DashboardState> {
  if (preferStatic) {
    return buildFallbackDashboardState();
  }

  const results = await Promise.allSettled([
    postJson<AcademicAnalysis>("/api/academic/analyze", profile),
    postJson<{ matches: ScholarshipMatch[] }>("/api/scholarships/match", profile),
    postJson<{ matches: OpportunityMatch[] }>("/api/research/match", profile),
    postJson<{ matches: OpportunityMatch[] }>("/api/internships/match", profile),
    postJson<ClubMatch[]>("/api/clubs/match", profile),
  ]);

  const fallbackSources: ServiceKey[] = [];

  const academic =
    results[0].status === "fulfilled"
      ? results[0].value
      : (fallbackSources.push("academic"), academicDemoFallback);
  const scholarships =
    results[1].status === "fulfilled"
      ? results[1].value
      : (fallbackSources.push("scholarships"), scholarshipsDemoFallback);
  const research =
    results[2].status === "fulfilled"
      ? results[2].value
      : (fallbackSources.push("research"), researchDemoFallback);
  const internships =
    results[3].status === "fulfilled"
      ? results[3].value
      : (fallbackSources.push("internships"), internshipsDemoFallback);
  const clubs =
    results[4].status === "fulfilled"
      ? results[4].value
      : (fallbackSources.push("clubs"), clubsDemoFallback);

  return {
    cards: [
      buildAcademicCard(academic),
      buildScholarshipsCard(scholarships),
      buildOpportunityCard("Research", research.matches, "/research", "Explore roles"),
      buildOpportunityCard("Internships", internships.matches, "/internships", "See matches"),
      buildClubsCard(clubs),
    ],
    fallbackSources,
    academicPercentComplete: academic.percentComplete,
  };
}

function buildFallbackDashboardState(): DashboardState {
  return {
    cards: [
      buildAcademicCard(academicDemoFallback),
      buildScholarshipsCard(scholarshipsDemoFallback),
      buildOpportunityCard("Research", researchDemoFallback.matches, "/research", "Explore roles"),
      buildOpportunityCard(
        "Internships",
        internshipsDemoFallback.matches,
        "/internships",
        "See matches",
      ),
      buildClubsCard(clubsDemoFallback),
    ],
    fallbackSources: ["academic", "scholarships", "research", "internships", "clubs"],
    academicPercentComplete: academicDemoFallback.percentComplete,
  };
}

export default function DashboardPage() {
  const { profile, setProfile, isHydrated, authStatus } = useProfile();
  const [dashboardState, setDashboardState] = useState<DashboardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const activeProfile = profile ?? (DEMO_STATIC ? DEMO_PROFILE : null);

    if (!activeProfile) {
      setDashboardState(null);
      setIsLoading(false);
      return;
    }

    const resolvedProfile = activeProfile;
    let isActive = true;

    async function load() {
      const shouldShowImmediateFallback = !dashboardState;

      if (shouldShowImmediateFallback) {
        setDashboardState(buildFallbackDashboardState());
      }

      setIsLoading(shouldShowImmediateFallback ? false : true);

      try {
        const nextState = await loadDashboardState(resolvedProfile, DEMO_STATIC);

        if (isActive) {
          setDashboardState(nextState);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, [isHydrated, profile, reloadKey]);

  if (!isHydrated || isLoading) {
    return <DashboardSkeleton />;
  }

  if (!profile && !DEMO_STATIC) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f5f5f4_55%,#f0fdf4_100%)] px-4 py-6 text-stone-900 md:px-8">
        <div className="mx-auto max-w-5xl space-y-6 pb-16">
          <NavBar />
          <section className="rounded-[32px] border border-stone-200 bg-white p-8 shadow-[0_18px_50px_rgba(28,25,23,0.08)] md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
              Dashboard
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
              Start with one profile.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
              Hook needs a student profile before it can rank classes, scholarships,
              research, internships, clubs, and support chat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className="rounded-full bg-orange-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-800"
              >
                Open onboarding
              </Link>
              <button
                type="button"
                onClick={() => {
                  void setProfile(DEMO_PROFILE);
                }}
                className="rounded-full border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-800 transition hover:border-orange-300"
              >
                Load demo profile
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const activeProfile = profile ?? DEMO_PROFILE;
  const firstName = getProfileFirstName(activeProfile);
  const fallbackSources = dashboardState?.fallbackSources ?? [];
  const usingFallback = fallbackSources.length > 0;
  const academicPercentComplete = dashboardState?.academicPercentComplete ?? 0;
  const fallbackLabel = DEMO_STATIC
    ? "Static demo data"
    : `Fallback active: ${fallbackSources.join(", ")}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f5f5f4_55%,#f0fdf4_100%)] px-4 py-6 text-stone-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-24">
        <NavBar />

        <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-stone-950 via-orange-900 to-orange-700 p-8 text-white shadow-[0_24px_70px_rgba(28,25,23,0.18)] md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-100/80">
                  Dashboard
                </p>
                {usingFallback ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-50">
                    {fallbackLabel}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                {`Welcome Back, ${firstName}.`}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-orange-50/90 md:text-base">
                Hook is coordinating your academic planning, funding, opportunities,
                communities, and support into one live student view.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-orange-100/70">
                  Current semester
                </p>
                <p className="mt-2 text-lg font-semibold">{activeProfile.currentSemester}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-orange-100/70">
                  Degree complete
                </p>
                <p className="mt-2 text-lg font-semibold">{academicPercentComplete}%</p>
              </div>
            </div>
          </div>

          {authStatus === "pending_verification" ? (
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-sm text-orange-50">
              Your account draft is saved, but UT email verification is still pending. The demo remains usable while you finish verification.
            </div>
          ) : null}

          {!DEMO_STATIC && usingFallback ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p className="text-sm text-orange-50/85">
                One or more engines failed live, so Hook switched to demo-safe static data.
              </p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Retry live data
              </button>
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {dashboardState?.cards.map((card) => (
            <SummaryCard key={card.title} {...card} />
          ))}
        </section>

        <ChatWindow title="Hook Chat" subtitle="Profile-aware assistant" />
      </div>
    </main>
  );
}
