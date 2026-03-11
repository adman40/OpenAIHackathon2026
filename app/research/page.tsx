"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OpportunityCard } from "../../components/opportunities/OpportunityCard";
import { OpportunityDetailPanel } from "../../components/opportunities/OpportunityDetailPanel";
import { OpportunityFilters } from "../../components/opportunities/OpportunityFilters";
import NavBar from "../../components/shared/NavBar";
import { DEMO_PROFILE, useProfile } from "../../lib/profile-context";
import { toRequestSafeProfile } from "../../lib/request-safe-profile";
import {
  getSavedOpportunityIds,
  toggleSavedOpportunityId,
} from "../../lib/opportunities/saved-opportunities";
import { isUrgentDate } from "../../lib/opportunities/deadline";
import type { OpportunityMatch } from "../../lib/types";

type MatchApiResponse = {
  matches: OpportunityMatch[];
};

const SORT_OPTIONS = [
  { value: "fit_desc", label: "Best fit" },
  { value: "deadline_soon", label: "Deadline soonest" },
];

function rank(matches: OpportunityMatch[]): OpportunityMatch[] {
  return [...matches].sort((a, b) => {
    if (b.fitScore !== a.fitScore) {
      return b.fitScore - a.fitScore;
    }
    return a.opportunity.applyBy.localeCompare(b.opportunity.applyBy);
  });
}

export default function ResearchPage(): JSX.Element {
  const { profile, isHydrated } = useProfile();
  const [matches, setMatches] = useState<OpportunityMatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [termFilter, setTermFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [sortBy, setSortBy] = useState("fit_desc");
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const activeProfile = profile ?? DEMO_PROFILE;

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/research/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: toRequestSafeProfile(activeProfile) }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as MatchApiResponse;
      const ranked = rank(payload.matches ?? []);
      setMatches(ranked);
      setSelectedId(ranked[0]?.opportunity.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load research matches.");
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void load();
  }, [isHydrated, load]);

  useEffect(() => {
    setSavedIds(getSavedOpportunityIds());
  }, []);

  const termOptions = useMemo(
    () => Array.from(new Set(matches.map((item) => item.opportunity.term))).sort(),
    [matches],
  );
  const locationOptions = useMemo(
    () => Array.from(new Set(matches.map((item) => item.opportunity.location))).sort(),
    [matches],
  );
  const skillOptions = useMemo(() => {
    const skills = matches.flatMap((item) => item.opportunity.skills);
    return Array.from(new Set(skills)).sort();
  }, [matches]);

  const filtered = useMemo(() => {
    const needle = keywordFilter.trim().toLowerCase();
    const base = matches.filter((match) => {
      const opportunity = match.opportunity;
      if (termFilter !== "all" && opportunity.term !== termFilter) {
        return false;
      }
      if (locationFilter !== "all" && opportunity.location !== locationFilter) {
        return false;
      }
      if (skillFilter !== "all" && !opportunity.skills.includes(skillFilter)) {
        return false;
      }
      if (needle.length > 0) {
        const text = `${opportunity.title} ${opportunity.organization} ${opportunity.description} ${opportunity.details}`.toLowerCase();
        if (!text.includes(needle)) {
          return false;
        }
      }
      if (savedOnly && !savedIds.includes(opportunity.id)) {
        return false;
      }
      return true;
    });

    if (sortBy === "deadline_soon") {
      return [...base].sort((a, b) => a.opportunity.applyBy.localeCompare(b.opportunity.applyBy));
    }

    return [...base].sort((a, b) => {
      if (b.fitScore !== a.fitScore) {
        return b.fitScore - a.fitScore;
      }
      return a.opportunity.applyBy.localeCompare(b.opportunity.applyBy);
    });
  }, [matches, termFilter, locationFilter, skillFilter, keywordFilter, savedOnly, savedIds, sortBy]);

  const urgentCount = useMemo(
    () => filtered.filter((match) => isUrgentDate(match.opportunity.applyBy)).length,
    [filtered],
  );
  const averageFit = useMemo(() => {
    if (filtered.length === 0) {
      return 0;
    }
    const total = filtered.reduce((sum, match) => sum + match.fitScore, 0);
    return Math.round(total / filtered.length);
  }, [filtered]);

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

  if (!isHydrated || isLoading) {
    return (
      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ margin: 0, color: "#111827", fontSize: "28px" }}>Research Opportunities</h1>
        <p style={{ color: "#4b5563", marginTop: "8px" }}>Loading research matches...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ margin: 0, color: "#111827", fontSize: "28px" }}>Research Opportunities</h1>
        <p style={{ color: "#b91c1c", marginTop: "8px" }}>Could not load research matches: {error}</p>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            marginTop: "10px",
            border: "1px solid #1d4ed8",
            background: "#eff6ff",
            color: "#1d4ed8",
            borderRadius: "8px",
            padding: "8px 10px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px 16px" }}>
      <NavBar />
      <h1 style={{ margin: 0, color: "#111827", fontSize: "28px" }}>Research Opportunities</h1>
      <p style={{ color: "#4b5563", marginTop: "8px" }}>
        Ranked by fit score with filters for research planning.
      </p>
      <div style={{ marginTop: "6px", display: "flex", gap: "10px", fontSize: "13px" }}>
        <a href="/internships" style={{ color: "#1d4ed8", textDecoration: "none" }}>
          View internships
        </a>
        <a href="/saved" style={{ color: "#1d4ed8", textDecoration: "none" }}>
          View saved opportunities
        </a>
      </div>
      <p style={{ color: "#4b5563", marginTop: "4px", fontSize: "14px" }}>
        Saved opportunities: {savedIds.length}
      </p>
      <div style={{ marginTop: "6px", display: "flex", gap: "12px", color: "#334155", fontSize: "13px" }}>
        <span>{filtered.length} visible</span>
        <span>{urgentCount} urgent deadlines</span>
        <span>Avg fit {averageFit}</span>
      </div>

      <div style={{ marginTop: "16px" }}>
        <OpportunityFilters
          termOptions={termOptions}
          selectedTerm={termFilter}
          onTermChange={setTermFilter}
          locationOptions={locationOptions}
          selectedLocation={locationFilter}
          onLocationChange={setLocationFilter}
          skillOptions={skillOptions}
          selectedSkill={skillFilter}
          onSkillChange={setSkillFilter}
          keyword={keywordFilter}
          onKeywordChange={setKeywordFilter}
          sortOptions={SORT_OPTIONS}
          selectedSort={sortBy}
          onSortChange={setSortBy}
          savedOnly={savedOnly}
          onSavedOnlyChange={setSavedOnly}
          savedCount={savedIds.length}
          onReset={() => {
            setTermFilter("all");
            setLocationFilter("all");
            setSkillFilter("all");
            setKeywordFilter("");
            setSortBy("fit_desc");
            setSavedOnly(false);
          }}
        />
      </div>

      {matches.length === 0 ? (
        <p style={{ marginTop: "18px", color: "#4b5563" }}>
          No research opportunities were returned.
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ marginTop: "18px", color: "#4b5563" }}>
          No opportunities match the current filters. Try broadening them.
        </p>
      ) : (
        <section
          style={{
            marginTop: "16px",
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "minmax(0, 1fr)",
            alignItems: "start",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: "10px",
            }}
            className="research-list-pane"
          >
            {filtered.map((match) => (
              <OpportunityCard
                key={match.opportunity.id}
                match={match}
                isSelected={selectedId === match.opportunity.id}
                onSelect={() => setSelectedId(match.opportunity.id)}
                isSaved={savedIds.includes(match.opportunity.id)}
                onToggleSaved={() => setSavedIds(toggleSavedOpportunityId(match.opportunity.id))}
              />
            ))}
          </div>
          <div className="research-detail-pane">
            <OpportunityDetailPanel
              match={selectedMatch}
              isSaved={selectedMatch ? savedIds.includes(selectedMatch.opportunity.id) : false}
              onToggleSaved={
                selectedMatch
                  ? () => setSavedIds(toggleSavedOpportunityId(selectedMatch.opportunity.id))
                  : undefined
              }
            />
          </div>
        </section>
      )}

      <style jsx>{`
        @media (min-width: 1024px) {
          section {
            grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr) !important;
            align-items: start;
          }

          .research-list-pane {
            max-height: calc(100vh - 280px);
            overflow-y: auto;
            padding-right: 6px;
          }

          .research-detail-pane {
            position: sticky;
            top: 24px;
            max-height: calc(100vh - 48px);
            overflow-y: auto;
          }
        }
      `}</style>
    </main>
  );
}
