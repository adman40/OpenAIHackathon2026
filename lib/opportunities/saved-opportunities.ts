const STORAGE_KEY = "hook:saved-opportunity-ids";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getSavedOpportunityIds(): string[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function persistSavedOpportunityIds(ids: string[]): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function toggleSavedOpportunityId(opportunityId: string): string[] {
  const current = getSavedOpportunityIds();
  const exists = current.includes(opportunityId);
  const updated = exists
    ? current.filter((id) => id !== opportunityId)
    : [...current, opportunityId];
  persistSavedOpportunityIds(updated);
  return updated;
}
