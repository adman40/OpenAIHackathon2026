type OpportunityFiltersProps = {
  termOptions: string[];
  selectedTerm: string;
  onTermChange: (value: string) => void;
  locationOptions?: string[];
  selectedLocation?: string;
  onLocationChange?: (value: string) => void;
  payOptions?: Array<{ label: string; value: string }>;
  selectedPay?: string;
  onPayChange?: (value: string) => void;
  skillOptions?: string[];
  selectedSkill?: string;
  onSkillChange?: (value: string) => void;
  keyword?: string;
  onKeywordChange?: (value: string) => void;
  onReset: () => void;
};

export function OpportunityFilters({
  termOptions,
  selectedTerm,
  onTermChange,
  locationOptions = [],
  selectedLocation = "all",
  onLocationChange,
  payOptions = [],
  selectedPay = "all",
  onPayChange,
  skillOptions = [],
  selectedSkill = "all",
  onSkillChange,
  keyword = "",
  onKeywordChange,
  onReset,
}: OpportunityFiltersProps): JSX.Element {
  return (
    <section
      style={{
        border: "1px solid #d1d5db",
        background: "#ffffff",
        borderRadius: "12px",
        padding: "12px",
        display: "grid",
        gap: "10px",
      }}
    >
      <div style={{ fontWeight: 700, color: "#111827" }}>Filters</div>

      <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "grid", gap: "4px", color: "#374151", fontSize: "14px" }}>
          Term
          <select value={selectedTerm} onChange={(event) => onTermChange(event.target.value)}>
            <option value="all">All terms</option>
            {termOptions.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </label>

        {locationOptions.length > 0 && onLocationChange ? (
          <label style={{ display: "grid", gap: "4px", color: "#374151", fontSize: "14px" }}>
            Location
            <select
              value={selectedLocation}
              onChange={(event) => onLocationChange(event.target.value)}
            >
              <option value="all">All locations</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {payOptions.length > 0 && onPayChange ? (
          <label style={{ display: "grid", gap: "4px", color: "#374151", fontSize: "14px" }}>
            Pay
            <select value={selectedPay} onChange={(event) => onPayChange(event.target.value)}>
              {payOptions.map((payOption) => (
                <option key={payOption.value} value={payOption.value}>
                  {payOption.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {skillOptions.length > 0 && onSkillChange ? (
          <label style={{ display: "grid", gap: "4px", color: "#374151", fontSize: "14px" }}>
            Skill
            <select value={selectedSkill} onChange={(event) => onSkillChange(event.target.value)}>
              <option value="all">All skills</option>
              {skillOptions.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {onKeywordChange ? (
        <label style={{ display: "grid", gap: "4px", color: "#374151", fontSize: "14px" }}>
          Keyword
          <input
            type="text"
            value={keyword}
            placeholder="Search title, org, or description"
            onChange={(event) => onKeywordChange(event.target.value)}
          />
        </label>
      ) : null}

      <div>
        <button
          type="button"
          onClick={onReset}
          style={{
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            borderRadius: "8px",
            padding: "8px 10px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Reset filters
        </button>
      </div>
    </section>
  );
}
