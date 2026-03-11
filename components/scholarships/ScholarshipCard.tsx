import type { ScholarshipMatch } from "../../lib/types";

type ScholarshipCardProps = {
  match: ScholarshipMatch;
  isSelected: boolean;
  onSelect: () => void;
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ScholarshipCard({
  match,
  isSelected,
  onSelect,
}: ScholarshipCardProps): JSX.Element {
  const { scholarship } = match;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        border: isSelected ? "2px solid #1d4ed8" : "1px solid #d1d5db",
        borderRadius: "12px",
        padding: "14px",
        textAlign: "left",
        background: "#ffffff",
        cursor: "pointer",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>
            {scholarship.name}
          </div>
          <div style={{ color: "#047857", fontWeight: 700, fontSize: "18px", marginTop: "6px" }}>
            {formatAmount(scholarship.amount)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "14px", color: "#1f2937", fontWeight: 600 }}>
            Fit {match.fitScore}
          </div>
          {match.isUrgent ? (
            <span
              style={{
                display: "inline-block",
                marginTop: "6px",
                background: "#fee2e2",
                color: "#991b1b",
                fontSize: "12px",
                fontWeight: 700,
                borderRadius: "999px",
                padding: "4px 8px",
              }}
            >
              URGENT
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: "10px", color: "#374151", fontSize: "14px" }}>
        Deadline: {match.deadline}
      </div>

      <ul style={{ margin: "10px 0 0 18px", padding: 0, color: "#374151", fontSize: "14px" }}>
        {match.matchReasons.slice(0, 2).map((reason) => (
          <li key={`${scholarship.id}-${reason}`}>{reason}</li>
        ))}
      </ul>
    </button>
  );
}
