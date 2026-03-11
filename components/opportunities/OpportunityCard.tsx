import type { OpportunityMatch } from "../../lib/types";
import { daysUntilDate, isUrgentDate } from "../../lib/opportunities/deadline";

type OpportunityCardProps = {
  match: OpportunityMatch;
  isSelected: boolean;
  onSelect: () => void;
  isSaved: boolean;
  onToggleSaved: () => void;
};

export function OpportunityCard({
  match,
  isSelected,
  onSelect,
  isSaved,
  onToggleSaved,
}: OpportunityCardProps): JSX.Element {
  const { opportunity } = match;
  const daysLeft = daysUntilDate(opportunity.applyBy);
  const urgent = isUrgentDate(opportunity.applyBy);

  return (
    <div
      role="group"
      aria-label={`${opportunity.title} at ${opportunity.organization}`}
      style={{
        border: isSelected ? "2px solid #1d4ed8" : "1px solid #d1d5db",
        borderRadius: "12px",
        background: "#ffffff",
        padding: "14px",
      }}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Open details for ${opportunity.title}`}
          aria-pressed={isSelected}
          style={{
            flex: 1,
            border: "none",
            padding: 0,
            margin: 0,
            textAlign: "left",
            cursor: "pointer",
            background: "transparent",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <div style={{ fontWeight: 800, color: "#111827", fontSize: "16px" }}>
                {opportunity.title}
              </div>
              <div style={{ marginTop: "4px", color: "#374151", fontSize: "14px" }}>
                {opportunity.organization}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, color: "#1f2937" }}>Fit {match.fitScore}</div>
              <div style={{ marginTop: "4px", fontSize: "13px", color: "#4b5563" }}>
                {opportunity.pay}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "10px", color: "#374151", fontSize: "14px" }}>
            {opportunity.location} | {opportunity.term} | Apply by {opportunity.applyBy}
          </div>
          <div style={{ marginTop: "6px", display: "flex", gap: "8px", alignItems: "center" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: urgent ? "#b91c1c" : "#334155",
                background: urgent ? "#fee2e2" : "#f1f5f9",
                borderRadius: "999px",
                padding: "2px 8px",
              }}
            >
              {daysLeft >= 0 ? `${daysLeft} days left` : "Deadline passed"}
            </span>
          </div>

          <ul style={{ margin: "10px 0 0 18px", padding: 0, color: "#374151", fontSize: "14px" }}>
            {match.matchReasons.slice(0, 2).map((reason) => (
              <li key={`${opportunity.id}-${reason}`}>{reason}</li>
            ))}
          </ul>
        </button>

        <button
          type="button"
          onClick={onToggleSaved}
          aria-label={isSaved ? `Unsave ${opportunity.title}` : `Save ${opportunity.title}`}
          aria-pressed={isSaved}
          style={{
            border: isSaved ? "1px solid #f59e0b" : "1px solid #cbd5e1",
            background: isSaved ? "#fffbeb" : "#f8fafc",
            color: isSaved ? "#b45309" : "#334155",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {isSaved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}
