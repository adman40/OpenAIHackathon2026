const SAVED_STORAGE_KEY = "hook:saved-opportunity-ids";
const ACTION_STATE_STORAGE_KEY = "hook:opportunity-action-state";

export type AppliedState = "pending" | "applied" | "not_applied";

export interface OpportunityActionState {
  appliedState: AppliedState;
  lastOpenedAt?: string;
  lastUpdatedAt: string;
}

type OpportunityActionStateMap = Record<string, OpportunityActionState>;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJsonFromStorage<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonToStorage<T>(key: string, value: T): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getSavedOpportunityIds(): string[] {
  const parsed = readJsonFromStorage<unknown>(SAVED_STORAGE_KEY, []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((value): value is string => typeof value === "string");
}

function persistSavedOpportunityIds(ids: string[]): void {
  writeJsonToStorage(SAVED_STORAGE_KEY, ids);
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

export function clearSavedOpportunityIds(): string[] {
  persistSavedOpportunityIds([]);
  return [];
}

export function getOpportunityActionStateMap(): OpportunityActionStateMap {
  const parsed = readJsonFromStorage<unknown>(ACTION_STATE_STORAGE_KEY, {});
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  const map = parsed as Record<string, unknown>;
  const normalized: OpportunityActionStateMap = {};
  Object.entries(map).forEach(([id, value]) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return;
    }

    const maybe = value as Record<string, unknown>;
    const appliedState = maybe.appliedState;
    const lastOpenedAt = maybe.lastOpenedAt;
    const lastUpdatedAt = maybe.lastUpdatedAt;

    if (
      (appliedState === "pending" || appliedState === "applied" || appliedState === "not_applied") &&
      typeof lastUpdatedAt === "string"
    ) {
      normalized[id] = {
        appliedState,
        lastOpenedAt: typeof lastOpenedAt === "string" ? lastOpenedAt : undefined,
        lastUpdatedAt,
      };
    }
  });

  return normalized;
}

function persistOpportunityActionStateMap(map: OpportunityActionStateMap): void {
  writeJsonToStorage(ACTION_STATE_STORAGE_KEY, map);
}

export function markOpportunityOpened(opportunityId: string): OpportunityActionStateMap {
  const current = getOpportunityActionStateMap();
  const now = new Date().toISOString();
  const existing = current[opportunityId];

  current[opportunityId] = {
    appliedState:
      existing?.appliedState === "applied" || existing?.appliedState === "not_applied"
        ? existing.appliedState
        : "pending",
    lastOpenedAt: now,
    lastUpdatedAt: now,
  };

  persistOpportunityActionStateMap(current);
  return current;
}

export function setOpportunityAppliedState(
  opportunityId: string,
  appliedState: AppliedState,
): OpportunityActionStateMap {
  const current = getOpportunityActionStateMap();
  const now = new Date().toISOString();

  current[opportunityId] = {
    appliedState,
    lastOpenedAt: current[opportunityId]?.lastOpenedAt,
    lastUpdatedAt: now,
  };

  persistOpportunityActionStateMap(current);
  return current;
}

export function getAppliedOpportunityIds(): string[] {
  const map = getOpportunityActionStateMap();
  return Object.entries(map)
    .filter(([, state]) => state.appliedState === "applied")
    .map(([id]) => id);
}

export function getPendingApplicationPromptIds(visibleIds?: string[]): string[] {
  const map = getOpportunityActionStateMap();
  const scope = visibleIds ? new Set(visibleIds) : null;

  return Object.entries(map)
    .filter(([id, state]) => {
      if (scope && !scope.has(id)) {
        return false;
      }
      return state.appliedState === "pending" && Boolean(state.lastOpenedAt);
    })
    .sort((a, b) => {
      const left = a[1].lastOpenedAt ?? "";
      const right = b[1].lastOpenedAt ?? "";
      return right.localeCompare(left);
    })
    .map(([id]) => id);
}
