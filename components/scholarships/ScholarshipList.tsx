import type { ScholarshipMatch } from "../../lib/types";
import { ScholarshipCard } from "./ScholarshipCard";

type ScholarshipListProps = {
  matches: ScholarshipMatch[];
  selectedScholarshipId: string | null;
  onSelectScholarship: (scholarshipId: string) => void;
};

export function ScholarshipList({
  matches,
  selectedScholarshipId,
  onSelectScholarship,
}: ScholarshipListProps): JSX.Element {
  return (
    <div style={{ display: "grid", gap: "10px" }}>
      {matches.map((match) => (
        <ScholarshipCard
          key={match.scholarship.id}
          match={match}
          isSelected={selectedScholarshipId === match.scholarship.id}
          onSelect={() => onSelectScholarship(match.scholarship.id)}
        />
      ))}
    </div>
  );
}
