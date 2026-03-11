"use client";

import { useEffect, useMemo, useState } from "react";

import { ScholarshipDetailPanel } from "../../components/scholarships/ScholarshipDetailPanel";
import { ScholarshipList } from "../../components/scholarships/ScholarshipList";
import NavBar from "../../components/shared/NavBar";
import { DEMO_PROFILE, useProfile } from "../../lib/profile-context";
import type { ScholarshipMatch } from "../../lib/types";

type MatchApiResponse = {
  matches: ScholarshipMatch[];
};

function rankMatches(matches: ScholarshipMatch[]): ScholarshipMatch[] {
  return [...matches].sort((a, b) => {
    if (b.fitScore !== a.fitScore) {
      return b.fitScore - a.fitScore;
    }
    if (a.isUrgent !== b.isUrgent) {
      return a.isUrgent ? -1 : 1;
    }
    return a.deadline.localeCompare(b.deadline);
  });
}

export default function ScholarshipsPage(): JSX.Element {
  const { profile, isHydrated } = useProfile();
  const [matches, setMatches] = useState<ScholarshipMatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    let isMounted = true;
    const activeProfile = profile ?? DEMO_PROFILE;

    async function loadMatches(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/scholarships/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: activeProfile }),
        });

        if (!response.ok) {
          throw new Error(`Match request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as MatchApiResponse;
        const ranked = rankMatches(payload.matches ?? []);

        if (!isMounted) {
          return;
        }

        setMatches(ranked);
        setSelectedId(ranked[0]?.scholarship.id ?? null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load scholarships right now.";
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadMatches();

    return () => {
      isMounted = false;
    };
  }, [isHydrated, profile]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.scholarship.id === selectedId) ?? null,
    [matches, selectedId],
  );

  if (!isHydrated || isLoading) {
    return (
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", color: "#111827" }}>Scholarships</h1>
        <p style={{ color: "#4b5563", marginTop: "8px" }}>Loading scholarship matches...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", color: "#111827" }}>Scholarships</h1>
        <p style={{ color: "#b91c1c", marginTop: "8px" }}>
          Could not load scholarships: {error}
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 16px" }}>
      <NavBar />
      <h1 style={{ margin: 0, fontSize: "28px", color: "#111827" }}>Scholarships</h1>
      <p style={{ color: "#4b5563", marginTop: "8px" }}>
        Ranked by fit score and urgency for your profile.
      </p>

      {matches.length === 0 ? (
        <p style={{ marginTop: "18px", color: "#4b5563" }}>
          No scholarship matches were returned for this profile.
        </p>
      ) : (
        <section
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: "16px",
          }}
        >
          <div style={{ display: "grid", gap: "16px" }}>
            <ScholarshipList
              matches={matches}
              selectedScholarshipId={selectedId}
              onSelectScholarship={setSelectedId}
            />
          </div>

          <ScholarshipDetailPanel match={selectedMatch} />
        </section>
      )}

      <style jsx>{`
        @media (min-width: 1024px) {
          section {
            grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr) !important;
            align-items: start;
          }
        }
      `}</style>
    </main>
  );
}
