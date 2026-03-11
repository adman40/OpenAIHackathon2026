"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ClubList } from "../../components/clubs/ClubList";
import NavBar from "../../components/shared/NavBar";
import { DEMO_PROFILE, useProfile } from "../../lib/profile-context";
import type { ClubMatch } from "../../lib/types";

export default function ClubsPage() {
  const { profile, isHydrated, authStatus } = useProfile();
  const [matches, setMatches] = useState<ClubMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activeProfile = profile ?? (authStatus === "demo" ? DEMO_PROFILE : null);

  const loadMatches = useCallback(async () => {
    if (!activeProfile) {
      setIsLoading(false);
      setMatches([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/clubs/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile: activeProfile }),
      });

      const body = (await response.json()) as ClubMatch[] | { error: string };

      if (!response.ok) {
        throw new Error("error" in body ? body.error : "Club match request failed.");
      }

      setMatches((body as ClubMatch[]).slice(0, 6));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to load club matches.",
      );
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    void loadMatches();
  }, [isHydrated, loadMatches]);

  if (!isHydrated) {
    return null;
  }

  if (!activeProfile) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <NavBar />
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-orange-700">Hook clubs matcher</p>
            <h1 className="mt-1 text-3xl font-semibold">Find communities that fit your week</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Finish onboarding first so Hook can rank clubs against your saved interests and
              weekly availability.
            </p>
            <Link
              href="/onboarding"
              className="mt-6 inline-flex rounded-full bg-orange-700 px-5 py-3 text-sm font-semibold text-white"
            >
              Open onboarding
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <NavBar />
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-orange-700">Hook clubs matcher</p>
          <h1 className="mt-1 text-3xl font-semibold">Find communities that fit your week</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Hook ranks student organizations using interests, major fit, and time availability
            so the list stays useful instead of overwhelming.
          </p>
          <p className="mt-4 text-sm text-slate-700">
            Profile: {activeProfile.major}, {activeProfile.hoursPerWeek ?? 5} hours/week
            available, interests in {activeProfile.clubInterests.slice(0, 3).join(", ")}.
          </p>
        </div>

        {isLoading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-700">Loading club matches...</p>
            <p className="mt-2 text-sm text-slate-500">
              Hook is comparing interests, major fit, and weekly time commitment.
            </p>
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="text-sm font-semibold text-red-800">Could not load club matches.</p>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white"
              onClick={() => void loadMatches()}
              type="button"
            >
              Try again
            </button>
          </section>
        ) : null}

        {!isLoading && !error ? <ClubList matches={matches} /> : null}
      </div>
    </main>
  );
}
