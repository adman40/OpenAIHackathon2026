"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OpportunityCard } from "../../components/opportunities/OpportunityCard";
import { OpportunityDetailPanel } from "../../components/opportunities/OpportunityDetailPanel";
import NavBar from "../../components/shared/NavBar";
import { DEMO_PROFILE, useProfile } from "../../lib/profile-context";
import { toRequestSafeProfile } from "../../lib/request-safe-profile";
import {
  clearSavedOpportunityIds,
  getOpportunityActionStateMap,
  getSavedOpportunityIds,
  markOpportunityOpened,
  setOpportunityAppliedState,
  toggleSavedOpportunityId,
  type AppliedState,
} from "../../lib/opportunities/saved-opportunities";
import type { OpportunityMatch } from "../../lib/types";

type MatchApiResponse = {
  matches: OpportunityMatch[];
};

function rank(matches: OpportunityMatch[]): OpportunityMatch[] {
  return [...matches].sort((a, b) => {
    if (b.fitScore !== a.fitScore) {
      return b.fitScore - a.fitScore;
    }
    return a.opportunity.applyBy.localeCompare(b.opportunity.applyBy);
  });
}

function exportMatches(matches: OpportunityMatch[]): void {
  const payload = matches.map((match) => ({
    id: match.opportunity.id,
    kind: match.opportunity.kind,
    title: match.opportunity.title,
    organization: match.opportunity.organization,
    applyBy: match.opportunity.applyBy,
    fitScore: match.fitScore,
    reasons: match.matchReasons,
  }));
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "hook-saved-opportunities.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function appliedStateForId(
  id: string,
  actionStateMap: ReturnType<typeof getOpportunityActionStateMap>,
): AppliedState | null {
  return actionStateMap[id]?.appliedState ?? null;
}

export default function SavedPage(): JSX.Element {
  const { profile, isHydrated } = useProfile();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [actionStateMap, setActionStateMap] = useState(getOpportunityActionStateMap());
  const [allMatches, setAllMatches] = useState<OpportunityMatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<"all" | "research" | "internship">("all");
  const [appliedFilter, setAppliedFilter] = useState<"all" | "applied" | "not_applied" | "pending">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const activeProfile = profile ?? DEMO_PROFILE;

    try {
      setIsLoading(true);
      setError(null);
      const currentSaved = getSavedOpportunityIds();
      setSavedIds(currentSaved);
      setActionStateMap(getOpportunityActionStateMap());

      const [researchRes, internshipsRes] = await Promise.all([
        fetch("/api/research/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: toRequestSafeProfile(activeProfile) }),
        }),
        fetch("/api/internships/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: toRequestSafeProfile(activeProfile) }),
        }),
      ]);

      if (!researchRes.ok || !internshipsRes.ok) {
        throw new Error("One or more opportunity APIs failed.");
      }

      const researchPayload = (await researchRes.json()) as MatchApiResponse;
      const internshipsPayload = (await internshipsRes.json()) as MatchApiResponse;
      const combined = rank([
        ...(researchPayload.matches ?? []),
        ...(internshipsPayload.matches ?? []),
      ]);

      setAllMatches(combined);
      const firstSaved = combined.find((item) => currentSaved.includes(item.opportunity.id));
      setSelectedId(firstSaved?.opportunity.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load saved opportunities.");
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

  const visible = useMemo(() => {
    return allMatches.filter((match) => {
      if (!savedIds.includes(match.opportunity.id)) {
        return false;
      }
      if (kindFilter !== "all" && match.opportunity.kind !== kindFilter) {
        return false;
      }
      const appliedState = appliedStateForId(match.opportunity.id, actionStateMap);
      if (appliedFilter !== "all" && appliedState !== appliedFilter) {
        return false;
      }
      return true;
    });
  }, [allMatches, savedIds, kindFilter, appliedFilter, actionStateMap]);

  const appliedSavedCount = useMemo(
    () => visible.filter((match) => appliedStateForId(match.opportunity.id, actionStateMap) === "applied").length,
    [visible, actionStateMap],
  );

  useEffect(() => {
    if (visible.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visible.some((item) => item.opportunity.id === selectedId)) {
      setSelectedId(visible[0].opportunity.id);
    }
  }, [visible, selectedId]);

  const selectedMatch = useMemo(
    () => visible.find((item) => item.opportunity.id === selectedId) ?? null,
    [visible, selectedId],
  );

  if (!isHydrated || isLoading) {
    return (
      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", color: "#111827" }}>Saved Opportunities</h1>
        <p style={{ marginTop: "8px", color: "#4b5563" }}>Loading saved items...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", color: "#111827" }}>Saved Opportunities</h1>
        <p style={{ marginTop: "8px", color: "#b91c1c" }}>Could not load saved items: {error}</p>
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
      <h1 style={{ margin: 0, fontSize: "28px", color: "#111827" }}>Saved Opportunities</h1>
      <p style={{ marginTop: "8px", color: "#4b5563" }}>
        Your bookmarked opportunities across research and internships, with applied-state tracking.
      </p>
      <div style={{ marginTop: "8px", color: "#334155", fontSize: "13px" }}>
        {visible.length} visible | {savedIds.length} saved total | {appliedSavedCount} marked applied
      </div>

      <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[
          { value: "all", label: "All" },
          { value: "research", label: "Research" },
          { value: "internship", label: "Internships" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setKindFilter(option.value as "all" | "research" | "internship")}
            style={{
              border: kindFilter === option.value ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
              background: kindFilter === option.value ? "#eff6ff" : "#ffffff",
              color: kindFilter === option.value ? "#1d4ed8" : "#334155",
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

      <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
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

      <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => exportMatches(visible)}
          disabled={visible.length === 0}
          style={{
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: "#334155",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "13px",
            cursor: visible.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Export JSON
        </button>

        <button
          type="button"
          onClick={() => {
            const cleared = clearSavedOpportunityIds();
            setSavedIds(cleared);
            setSelectedId(null);
          }}
          disabled={savedIds.length === 0}
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "13px",
            cursor: savedIds.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Clear Saved
        </button>
      </div>

      {savedIds.length === 0 ? (
        <p style={{ marginTop: "18px", color: "#4b5563" }}>
          No saved opportunities yet. Save items from Research or Internships.
        </p>
      ) : visible.length === 0 ? (
        <p style={{ marginTop: "18px", color: "#4b5563" }}>
          No saved opportunities in this filter view.
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
            {visible.map((match) => (
              <OpportunityCard
                key={match.opportunity.id}
                match={match}
                isSelected={selectedId === match.opportunity.id}
                onSelect={() => setSelectedId(match.opportunity.id)}
                isSaved={savedIds.includes(match.opportunity.id)}
                onToggleSaved={() => setSavedIds(toggleSavedOpportunityId(match.opportunity.id))}
                onOpenListing={(opportunityId, url) => {
                  window.open(url, "_blank", "noopener,noreferrer");
                  setActionStateMap(markOpportunityOpened(opportunityId));
                }}
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
                ? (state) => setActionStateMap(setOpportunityAppliedState(selectedMatch.opportunity.id, state))
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
