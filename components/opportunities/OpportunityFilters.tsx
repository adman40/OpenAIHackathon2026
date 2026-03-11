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
  sortOptions?: Array<{ label: string; value: string }>;
  selectedSort?: string;
  onSortChange?: (value: string) => void;
  savedOnly?: boolean;
  onSavedOnlyChange?: (value: boolean) => void;
  savedCount?: number;
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
  sortOptions = [],
  selectedSort = "fit_desc",
  onSortChange,
  savedOnly = false,
  onSavedOnlyChange,
  savedCount = 0,
  onReset,
}: OpportunityFiltersProps): JSX.Element {
  const fieldLabelStyle: React.CSSProperties = {
    display: "grid",
    gap: "4px",
    color: "#374151",
    fontSize: "14px",
    minWidth: 0,
  };

  const fieldInputStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  };

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
        <label style={fieldLabelStyle}>
          Term
          <select
            value={selectedTerm}
            onChange={(event) => onTermChange(event.target.value)}
            style={fieldInputStyle}
          >
            <option value="all">All terms</option>
            {termOptions.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </label>

        {locationOptions.length > 0 && onLocationChange ? (
          <label style={fieldLabelStyle}>
            Location
            <select
              value={selectedLocation}
              onChange={(event) => onLocationChange(event.target.value)}
              style={fieldInputStyle}
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
          <label style={fieldLabelStyle}>
            Pay
            <select
              value={selectedPay}
              onChange={(event) => onPayChange(event.target.value)}
              style={fieldInputStyle}
            >
              {payOptions.map((payOption) => (
                <option key={payOption.value} value={payOption.value}>
                  {payOption.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {skillOptions.length > 0 && onSkillChange ? (
          <label style={fieldLabelStyle}>
            Skill
            <select
              value={selectedSkill}
              onChange={(event) => onSkillChange(event.target.value)}
              style={fieldInputStyle}
            >
              <option value="all">All skills</option>
              {skillOptions.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {sortOptions.length > 0 && onSortChange ? (
          <label style={fieldLabelStyle}>
            Sort
            <select
              value={selectedSort}
              onChange={(event) => onSortChange(event.target.value)}
              style={fieldInputStyle}
            >
              {sortOptions.map((sortOption) => (
                <option key={sortOption.value} value={sortOption.value}>
                  {sortOption.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {onKeywordChange ? (
        <label style={fieldLabelStyle}>
          Keyword
          <input
            type="text"
            value={keyword}
            placeholder="Search title, org, or description"
            onChange={(event) => onKeywordChange(event.target.value)}
            style={fieldInputStyle}
          />
        </label>
      ) : null}

      {onSavedOnlyChange ? (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#374151",
            fontSize: "14px",
          }}
        >
          <input
            type="checkbox"
            checked={savedOnly}
            onChange={(event) => onSavedOnlyChange(event.target.checked)}
          />
          Show saved only ({savedCount})
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
