"use client";

import { useCallback, useEffect, useState } from "react";

import { ClubList } from "../../components/clubs/ClubList";
import { ClubMatch, StudentProfile } from "../../lib/types";

const DEMO_PROFILE: StudentProfile = {
  name: "Alex Rivera",
  major: "Computer Science",
  currentSemester: "Spring 2026",
  completedCourses: [
    { courseId: "CS 101", grade: "A-" },
    { courseId: "MATH 221", grade: "B+" },
  ],
  gpaRange: "3.5-4.0",
  gpaPublic: false,
  residency: "texas",
  financialNeed: "medium",
  resumeSummary: "CS student interested in AI, student tools, and mission-driven product work.",
  skills: ["python", "typescript"],
  interests: ["ai", "education", "community", "product"],
  careerGoal: "research",
  preferredLocations: [],
  preferredTerms: [],
  clubInterests: ["ai", "entrepreneurship", "student tools", "community"],
  hoursPerWeek: 5,
};

export default function ClubsPage() {
  const [matches, setMatches] = useState<ClubMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/clubs/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile: DEMO_PROFILE }),
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
  }, []);

  useEffect(() => {
    // The clubs page uses a local demo profile until the shared profile context lands.
    void loadMatches();
  }, [loadMatches]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-orange-700">Hook clubs matcher</p>
          <h1 className="mt-1 text-3xl font-semibold">Find communities that fit your week</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Hook ranks student organizations using interests, major, career goals, and time availability so the list stays useful instead of overwhelming.
          </p>
          <p className="mt-4 text-sm text-slate-700">
            Demo profile: {DEMO_PROFILE.major}, {DEMO_PROFILE.hoursPerWeek} hours/week available, interests in{" "}
            {DEMO_PROFILE.clubInterests.slice(0, 3).join(", ")}.
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
