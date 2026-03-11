import type { OpportunityMatch } from "../../lib/types";
import { daysUntilDate, isUrgentDate } from "../../lib/opportunities/deadline";
import type { AppliedState } from "../../lib/opportunities/saved-opportunities";

type OpportunityDetailPanelProps = {
  match: OpportunityMatch | null;
  isSaved?: boolean;
  onToggleSaved?: () => void;
  appliedState?: AppliedState | null;
  onSetAppliedState?: (state: AppliedState) => void;
};

export function OpportunityDetailPanel({
  match,
  isSaved = false,
  onToggleSaved,
  appliedState = null,
  onSetAppliedState,
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
        <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onToggleSaved}
            style={{
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
          {opportunity.applyUrl ? (
            <a
              href={opportunity.applyUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                border: "1px solid #1d4ed8",
                background: "#1d4ed8",
                color: "#ffffff",
                borderRadius: "8px",
                padding: "6px 10px",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Apply Now
            </a>
          ) : null}
          {onSetAppliedState ? (
            <>
              <button
                type="button"
                onClick={() => onSetAppliedState("applied")}
                style={{
                  border: appliedState === "applied" ? "1px solid #166534" : "1px solid #bbf7d0",
                  background: appliedState === "applied" ? "#dcfce7" : "#f0fdf4",
                  color: "#166534",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Mark Applied
              </button>
              <button
                type="button"
                onClick={() => onSetAppliedState("not_applied")}
                style={{
                  border: appliedState === "not_applied" ? "1px solid #9a3412" : "1px solid #fed7aa",
                  background: appliedState === "not_applied" ? "#ffedd5" : "#fff7ed",
                  color: "#9a3412",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Not Applied Yet
              </button>
            </>
          ) : null}
        </div>
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

      {opportunity.contactLeads && opportunity.contactLeads.length > 0 ? (
        <section style={{ marginTop: "14px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#111827" }}>Likely Contacts</h3>
          <ul style={{ margin: "8px 0 0 18px", padding: 0, color: "#374151", fontSize: "14px" }}>
            {opportunity.contactLeads.map((lead) => (
              <li key={`${opportunity.id}-${lead}`}>{lead}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {opportunity.sourceUrl ? (
        <a
          href={opportunity.sourceUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            marginTop: "16px",
            display: "inline-block",
            background: "#1d4ed8",
            color: "#ffffff",
            borderRadius: "8px",
            fontWeight: 600,
            textDecoration: "none",
            padding: "10px 14px",
            fontSize: "14px",
          }}
        >
          View Official Source
        </a>
      ) : null}
    </aside>
  );
}
