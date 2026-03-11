"use client";

import { useEffect, useMemo, useState } from "react";

import { OpportunityCard } from "../../components/opportunities/OpportunityCard";
import { OpportunityDetailPanel } from "../../components/opportunities/OpportunityDetailPanel";
import { OpportunityFilters } from "../../components/opportunities/OpportunityFilters";
import type { OpportunityMatch, StudentProfile } from "../../lib/types";

type MatchApiResponse = {
  matches: OpportunityMatch[];
};

const PAY_OPTIONS = [
  { value: "all", label: "All pay bands" },
  { value: "30_plus", label: "$30+/hour" },
  { value: "20_29", label: "$20-$29/hour" },
  { value: "below_20", label: "Below $20/hour" },
];

const DEMO_PROFILE: StudentProfile = {
  name: "Alex Rivera",
  major: "Computer Science",
  currentSemester: "Spring 2026",
  completedCourses: [
    { courseId: "CS 312", grade: "A" },
    { courseId: "CS 314", grade: "A-" },
    { courseId: "CS 315", grade: "B+" },
    { courseId: "CS 429", grade: "A-" },
    { courseId: "SDS 321", grade: "A" },
  ],
  gpaRange: "3.5-4.0",
  gpaPublic: true,
  residency: "texas",
  financialNeed: "medium",
  resumeSummary:
    "CS student with Python and TypeScript experience looking for software engineering internships.",
  skills: ["python", "typescript", "react", "sql", "node"],
  interests: ["product engineering", "ai", "education", "startup"],
  careerGoal: "industry",
  preferredLocations: ["Austin", "Remote"],
  preferredTerms: ["summer", "fall"],
  clubInterests: ["ai", "entrepreneurship"],
};

function extractHourlyPay(payText: string): number | null {
  const match = payText.match(/\$(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function payBandMatches(payText: string, band: string): boolean {
  if (band === "all") {
    return true;
  }
  const hourly = extractHourlyPay(payText);
  if (hourly === null) {
    return false;
  }
  if (band === "30_plus") {
    return hourly >= 30;
  }
  if (band === "20_29") {
    return hourly >= 20 && hourly < 30;
  }
  if (band === "below_20") {
    return hourly < 20;
  }
  return true;
}

function rank(matches: OpportunityMatch[]): OpportunityMatch[] {
  return [...matches].sort((a, b) => {
    if (b.fitScore !== a.fitScore) {
      return b.fitScore - a.fitScore;
    }
    return a.opportunity.applyBy.localeCompare(b.opportunity.applyBy);
  });
}

export default function InternshipsPage(): JSX.Element {
  const [matches, setMatches] = useState<OpportunityMatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [termFilter, setTermFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/internships/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: DEMO_PROFILE }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as MatchApiResponse;
        const ranked = rank(payload.matches ?? []);
        if (!mounted) {
          return;
        }
        setMatches(ranked);
        setSelectedId(ranked[0]?.opportunity.id ?? null);
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load internship matches.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const termOptions = useMemo(
    () => Array.from(new Set(matches.map((item) => item.opportunity.term))).sort(),
    [matches],
  );
  const locationOptions = useMemo(
    () => Array.from(new Set(matches.map((item) => item.opportunity.location))).sort(),
    [matches],
  );

  const filtered = useMemo(() => {
    return matches.filter((match) => {
      const opportunity = match.opportunity;
      if (termFilter !== "all" && opportunity.term !== termFilter) {
        return false;
      }
      if (locationFilter !== "all" && opportunity.location !== locationFilter) {
        return false;
      }
      if (!payBandMatches(opportunity.pay, payFilter)) {
        return false;
      }
      return true;
    });
  }, [matches, termFilter, locationFilter, payFilter]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }

    const stillVisible = filtered.some((item) => item.opportunity.id === selectedId);
    if (!stillVisible) {
      setSelectedId(filtered[0].opportunity.id);
    }
  }, [filtered, selectedId]);

  const selectedMatch = useMemo(
    () => filtered.find((item) => item.opportunity.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  if (isLoading) {
    return (
      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ margin: 0, color: "#111827", fontSize: "28px" }}>Internships</h1>
        <p style={{ color: "#4b5563", marginTop: "8px" }}>Loading internship matches...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ margin: 0, color: "#111827", fontSize: "28px" }}>Internships</h1>
        <p style={{ color: "#b91c1c", marginTop: "8px" }}>
          Could not load internship matches: {error}
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ margin: 0, color: "#111827", fontSize: "28px" }}>Internships</h1>
      <p style={{ color: "#4b5563", marginTop: "8px" }}>
        Ranked internships with filters for location, pay, and term.
      </p>

      <div style={{ marginTop: "16px" }}>
        <OpportunityFilters
          termOptions={termOptions}
          selectedTerm={termFilter}
          onTermChange={setTermFilter}
          locationOptions={locationOptions}
          selectedLocation={locationFilter}
          onLocationChange={setLocationFilter}
          payOptions={PAY_OPTIONS}
          selectedPay={payFilter}
          onPayChange={setPayFilter}
          onReset={() => {
            setTermFilter("all");
            setLocationFilter("all");
            setPayFilter("all");
          }}
        />
      </div>

      {matches.length === 0 ? (
        <p style={{ marginTop: "18px", color: "#4b5563" }}>
          No internship opportunities were returned.
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ marginTop: "18px", color: "#4b5563" }}>
          No internships match the current filters. Try broadening them.
        </p>
      ) : (
        <section
          style={{
            marginTop: "16px",
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "minmax(0, 1fr)",
          }}
        >
          <div style={{ display: "grid", gap: "10px" }}>
            {filtered.map((match) => (
              <OpportunityCard
                key={match.opportunity.id}
                match={match}
                isSelected={selectedId === match.opportunity.id}
                onSelect={() => setSelectedId(match.opportunity.id)}
              />
            ))}
          </div>
          <OpportunityDetailPanel match={selectedMatch} />
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
