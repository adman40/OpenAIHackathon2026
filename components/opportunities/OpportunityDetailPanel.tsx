import type { OpportunityMatch } from "../../lib/types";
import { daysUntilDate, isUrgentDate } from "../../lib/opportunities/deadline";

type OpportunityDetailPanelProps = {
  match: OpportunityMatch | null;
  isSaved?: boolean;
  onToggleSaved?: () => void;
};

export function OpportunityDetailPanel({
  match,
  isSaved = false,
  onToggleSaved,
}: OpportunityDetailPanelProps): JSX.Element {
  if (!match) {
    return (
      <aside
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "12px",
          background: "#ffffff",
          padding: "16px",
          color: "#4b5563",
        }}
      >
        Select an opportunity to view details.
      </aside>
    );
  }

  const { opportunity } = match;
  const daysLeft = daysUntilDate(opportunity.applyBy);
  const urgent = isUrgentDate(opportunity.applyBy);

  return (
    <aside
      aria-live="polite"
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "12px",
        background: "#ffffff",
        padding: "16px",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: "20px", color: "#111827" }}>{opportunity.title}</div>
      <div style={{ marginTop: "5px", color: "#374151" }}>{opportunity.organization}</div>

      {onToggleSaved ? (
        <button
          type="button"
          onClick={onToggleSaved}
          aria-label={isSaved ? `Unsave ${opportunity.title}` : `Save ${opportunity.title}`}
          aria-pressed={isSaved}
          style={{
            marginTop: "10px",
            border: isSaved ? "1px solid #f59e0b" : "1px solid #cbd5e1",
            background: isSaved ? "#fffbeb" : "#f8fafc",
            color: isSaved ? "#b45309" : "#334155",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isSaved ? "Saved Opportunity" : "Save Opportunity"}
        </button>
      ) : null}

      <div style={{ marginTop: "12px", display: "grid", gap: "6px", color: "#1f2937", fontSize: "14px" }}>
        <div>Fit Score: {match.fitScore}</div>
        <div>Location: {opportunity.location}</div>
        <div>Pay: {opportunity.pay}</div>
        <div>Term: {opportunity.term}</div>
        <div>
          Apply By: <strong>{opportunity.applyBy}</strong>
        </div>
        <div>
          Deadline Status:{" "}
          <strong style={{ color: urgent ? "#b91c1c" : "#1f2937" }}>
            {daysLeft >= 0 ? `${daysLeft} days left` : "Deadline passed"}
          </strong>
        </div>
      </div>

      <section style={{ marginTop: "14px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#111827" }}>Why this matches</h3>
        <ul style={{ margin: "8px 0 0 18px", padding: 0, color: "#374151", fontSize: "14px" }}>
          {match.matchReasons.map((reason) => (
            <li key={`${opportunity.id}-${reason}`}>{reason}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: "14px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#111827" }}>Description</h3>
        <p style={{ color: "#374151", fontSize: "14px", lineHeight: 1.5 }}>{opportunity.description}</p>
      </section>

      <section style={{ marginTop: "14px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#111827" }}>Details</h3>
        <p style={{ color: "#374151", fontSize: "14px", lineHeight: 1.5 }}>{opportunity.details}</p>
      </section>
    </aside>
  );
}
