import type { ScholarshipMatch } from "../../lib/types";

type ScholarshipDetailPanelProps = {
  match: ScholarshipMatch | null;
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ScholarshipDetailPanel({
  match,
}: ScholarshipDetailPanelProps): JSX.Element {
  if (!match) {
    return (
      <aside
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "12px",
          padding: "16px",
          background: "#ffffff",
          color: "#4b5563",
        }}
      >
        Select a scholarship to see details.
      </aside>
    );
  }

  const { scholarship } = match;

  return (
    <aside
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "12px",
        padding: "16px",
        background: "#ffffff",
      }}
    >
      <div style={{ fontWeight: 800, color: "#111827", fontSize: "20px" }}>{scholarship.name}</div>
      <div style={{ marginTop: "8px", fontWeight: 700, color: "#047857", fontSize: "18px" }}>
        {formatAmount(scholarship.amount)}
      </div>

      <div style={{ marginTop: "12px", display: "grid", gap: "6px", color: "#1f2937", fontSize: "14px" }}>
        <div>Fit Score: {match.fitScore}</div>
        <div>Deadline: {match.deadline}</div>
        <div>
          Status:{" "}
          <strong style={{ color: match.isUrgent ? "#b91c1c" : "#1f2937" }}>
            {match.isUrgent ? "Urgent" : "Upcoming"}
          </strong>
        </div>
      </div>

      <section style={{ marginTop: "14px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#111827" }}>Why this is a fit</h3>
        <ul style={{ margin: "8px 0 0 18px", padding: 0, color: "#374151", fontSize: "14px" }}>
          {match.matchReasons.map((reason) => (
            <li key={`${scholarship.id}-${reason}`}>{reason}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: "14px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#111827" }}>Description</h3>
        <p style={{ color: "#374151", fontSize: "14px", lineHeight: 1.5 }}>{scholarship.description}</p>
      </section>

      <section style={{ marginTop: "14px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#111827" }}>Submission Details</h3>
        <p style={{ color: "#374151", fontSize: "14px", lineHeight: 1.5 }}>
          {scholarship.submissionDetails}
        </p>
      </section>

      <a
        href={scholarship.link}
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
        Apply Now
      </a>
    </aside>
  );
}
