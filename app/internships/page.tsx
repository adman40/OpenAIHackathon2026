"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OpportunityCard } from "../../components/opportunities/OpportunityCard";
import { OpportunityDetailPanel } from "../../components/opportunities/OpportunityDetailPanel";
import { OpportunityFilters } from "../../components/opportunities/OpportunityFilters";
import NavBar from "../../components/shared/NavBar";
import { DEMO_PROFILE, useProfile } from "../../lib/profile-context";
import {
  getOpportunityActionStateMap,
  getPendingApplicationPromptIds,
  getSavedOpportunityIds,
  markOpportunityOpened,
  setOpportunityAppliedState,
  toggleSavedOpportunityId,
  type AppliedState,
} from "../../lib/opportunities/saved-opportunities";
import { isUrgentDate } from "../../lib/opportunities/deadline";
import type { OpportunityMatch } from "../../lib/types";

type MatchApiResponse = {
  matches: OpportunityMatch[];
};

const PAY_OPTIONS = [
  { value: "all", label: "All pay bands" },
  { value: "30_plus", label: "$30+/hour" },
  { value: "20_29", label: "$20-$29/hour" },
  { value: "below_20", label: "Below $20/hour" },
];

const SORT_OPTIONS = [
  { value: "fit_desc", label: "Best fit" },
  { value: "deadline_soon", label: "Deadline soonest" },
  { value: "pay_high", label: "Highest pay" },
  { value: "freshness_new", label: "Most recent" },
];

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

function appliedStateForId(
  id: string,
  actionStateMap: ReturnType<typeof getOpportunityActionStateMap>,
): AppliedState | null {
  return actionStateMap[id]?.appliedState ?? null;
}

export default function InternshipsPage(): JSX.Element {
  const { profile, isHydrated } = useProfile();
  const [matches, setMatches] = useState<OpportunityMatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [termFilter, setTermFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [sortBy, setSortBy] = useState("fit_desc");
  const [savedOnly, setSavedOnly] = useState(false);
  const [appliedFilter, setAppliedFilter] = useState<"all" | "applied" | "not_applied" | "pending">("all");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [actionStateMap, setActionStateMap] = useState(getOpportunityActionStateMap());
  const [promptOpportunityId, setPromptOpportunityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const activeProfile = profile ?? DEMO_PROFILE;

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/internships/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: activeProfile }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as MatchApiResponse;
      const ranked = rank(payload.matches ?? []);
      setMatches(ranked);
      setSelectedId(ranked[0]?.opportunity.id ?? null);
      setSavedIds(getSavedOpportunityIds());
      setActionStateMap(getOpportunityActionStateMap());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load internship matches.");
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

  const termOptions = useMemo(
    () => Array.from(new Set(matches.map((item) => item.opportunity.term))).sort(),
    [matches],
  );
  const locationOptions = useMemo(
    () => Array.from(new Set(matches.map((item) => item.opportunity.location))).sort(),
    [matches],
  );

  const filtered = useMemo(() => {
    const base = matches.filter((match) => {
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
      if (savedOnly && !savedIds.includes(opportunity.id)) {
        return false;
      }

      const appliedState = appliedStateForId(opportunity.id, actionStateMap);
      if (appliedFilter !== "all" && appliedState !== appliedFilter) {
        return false;
      }

      return true;
    });

    if (sortBy === "deadline_soon") {
      return [...base].sort((a, b) => a.opportunity.applyBy.localeCompare(b.opportunity.applyBy));
    }

    if (sortBy === "pay_high") {
      return [...base].sort((a, b) => {
        const left = extractHourlyPay(a.opportunity.pay) ?? 0;
        const right = extractHourlyPay(b.opportunity.pay) ?? 0;
        if (right !== left) {
          return right - left;
        }
        return b.fitScore - a.fitScore;
      });
    }

    if (sortBy === "freshness_new") {
      return [...base].sort((a, b) => {
        const left = a.opportunity.freshnessTimestamp ?? "";
        const right = b.opportunity.freshnessTimestamp ?? "";
        return right.localeCompare(left);
      });
    }

    return [...base].sort((a, b) => {
      if (b.fitScore !== a.fitScore) {
        return b.fitScore - a.fitScore;
      }
      return a.opportunity.applyBy.localeCompare(b.opportunity.applyBy);
    });
  }, [
    matches,
    termFilter,
    locationFilter,
    payFilter,
    savedOnly,
    savedIds,
    sortBy,
    appliedFilter,
    actionStateMap,
  ]);

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

  const appliedCount = useMemo(
    () => matches.filter((match) => appliedStateForId(match.opportunity.id, actionStateMap) === "applied").length,
    [matches, actionStateMap],
  );

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

  const pendingPromptIds = useMemo(
    () => getPendingApplicationPromptIds(matches.map((match) => match.opportunity.id)),
    [matches, actionStateMap],
  );

  useEffect(() => {
    if (promptOpportunityId) {
      return;
    }
    if (pendingPromptIds.length > 0) {
      setPromptOpportunityId(pendingPromptIds[0]);
    }
  }, [pendingPromptIds, promptOpportunityId]);

  const promptMatch = useMemo(
    () => matches.find((match) => match.opportunity.id === promptOpportunityId) ?? null,
    [matches, promptOpportunityId],
  );

  const handleOpenListing = (opportunityId: string, url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    setActionStateMap(markOpportunityOpened(opportunityId));
  };

  const handleSetAppliedState = (opportunityId: string, state: AppliedState) => {
    setActionStateMap(setOpportunityAppliedState(opportunityId, state));
    if (promptOpportunityId === opportunityId) {
      setPromptOpportunityId(null);
    }
  };

  if (!isHydrated || isLoading) {
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
      <h1 style={{ margin: 0, color: "#111827", fontSize: "28px" }}>Internships</h1>
      <p style={{ color: "#4b5563", marginTop: "8px" }}>
        Imported internship postings with saved and applied workflow tracking.
      </p>
      <div style={{ marginTop: "6px", display: "flex", gap: "10px", fontSize: "13px" }}>
        <a href="/research" style={{ color: "#1d4ed8", textDecoration: "none" }}>
          View research
        </a>
        <a href="/saved" style={{ color: "#1d4ed8", textDecoration: "none" }}>
          View saved opportunities
        </a>
      </div>
      <p style={{ color: "#4b5563", marginTop: "4px", fontSize: "14px" }}>
        Saved opportunities: {savedIds.length} | Applied tracked: {appliedCount}
      </p>
      <div style={{ marginTop: "6px", display: "flex", gap: "12px", color: "#334155", fontSize: "13px" }}>
        <span>{filtered.length} visible</span>
        <span>{urgentCount} urgent deadlines</span>
        <span>Avg fit {averageFit}</span>
      </div>

      {promptMatch ? (
        <section
          style={{
            marginTop: "14px",
            border: "1px solid #fed7aa",
            background: "#fff7ed",
            borderRadius: "10px",
            padding: "12px",
            display: "grid",
            gap: "8px",
          }}
        >
          <strong style={{ color: "#9a3412" }}>Quick follow-up</strong>
          <span style={{ color: "#7c2d12", fontSize: "14px" }}>
            Did you apply to <strong>{promptMatch.opportunity.title}</strong> at {promptMatch.opportunity.organization}?
          </span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => handleSetAppliedState(promptMatch.opportunity.id, "applied")}
              style={{ border: "1px solid #166534", background: "#dcfce7", color: "#166534", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
            >
              Yes, applied
            </button>
            <button
              type="button"
              onClick={() => handleSetAppliedState(promptMatch.opportunity.id, "not_applied")}
              style={{ border: "1px solid #9a3412", background: "#ffedd5", color: "#9a3412", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
            >
              Not yet
            </button>
            <button
              type="button"
              onClick={() => setPromptOpportunityId(null)}
              style={{ border: "1px solid #cbd5e1", background: "#ffffff", color: "#334155", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
            >
              Ask later
            </button>
          </div>
        </section>
      ) : null}

      <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[
          { value: "all", label: "All statuses" },
          { value: "applied", label: "Applied" },
          { value: "not_applied", label: "Not applied" },
          { value: "pending", label: "Awaiting response" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setAppliedFilter(option.value as typeof appliedFilter)}
            style={{
              border: appliedFilter === option.value ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
              background: appliedFilter === option.value ? "#eff6ff" : "#ffffff",
              color: appliedFilter === option.value ? "#1d4ed8" : "#334155",
              borderRadius: "999px",
              padding: "6px 10px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

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
          sortOptions={SORT_OPTIONS}
          selectedSort={sortBy}
          onSortChange={setSortBy}
          savedOnly={savedOnly}
          onSavedOnlyChange={setSavedOnly}
          savedCount={savedIds.length}
          onReset={() => {
            setTermFilter("all");
            setLocationFilter("all");
            setPayFilter("all");
            setSortBy("fit_desc");
            setSavedOnly(false);
            setAppliedFilter("all");
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
                isSaved={savedIds.includes(match.opportunity.id)}
                onToggleSaved={() => setSavedIds(toggleSavedOpportunityId(match.opportunity.id))}
                onOpenListing={handleOpenListing}
                appliedState={appliedStateForId(match.opportunity.id, actionStateMap)}
              />
            ))}
          </div>
          <OpportunityDetailPanel
            match={selectedMatch}
            isSaved={selectedMatch ? savedIds.includes(selectedMatch.opportunity.id) : false}
            onToggleSaved={
              selectedMatch
                ? () => setSavedIds(toggleSavedOpportunityId(selectedMatch.opportunity.id))
                : undefined
            }
            appliedState={selectedMatch ? appliedStateForId(selectedMatch.opportunity.id, actionStateMap) : null}
            onSetAppliedState={
              selectedMatch
                ? (state) => handleSetAppliedState(selectedMatch.opportunity.id, state)
                : undefined
            }
          />
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
