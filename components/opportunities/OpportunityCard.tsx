import type { OpportunityMatch } from "../../lib/types";

type OpportunityCardProps = {
  match: OpportunityMatch;
  isSelected: boolean;
  onSelect: () => void;
};

export function OpportunityCard({
  match,
  isSelected,
  onSelect,
}: OpportunityCardProps): JSX.Element {
  const { opportunity } = match;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        border: isSelected ? "2px solid #1d4ed8" : "1px solid #d1d5db",
        borderRadius: "12px",
        background: "#ffffff",
        padding: "14px",
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
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
          <div style={{ marginTop: "4px", fontSize: "13px", color: "#4b5563" }}>{opportunity.pay}</div>
        </div>
      </div>

      <div style={{ marginTop: "10px", color: "#374151", fontSize: "14px" }}>
        {opportunity.location} | {opportunity.term} | Apply by {opportunity.applyBy}
      </div>

      <ul style={{ margin: "10px 0 0 18px", padding: 0, color: "#374151", fontSize: "14px" }}>
        {match.matchReasons.slice(0, 2).map((reason) => (
          <li key={`${opportunity.id}-${reason}`}>{reason}</li>
        ))}
      </ul>
    </button>
  );
}
