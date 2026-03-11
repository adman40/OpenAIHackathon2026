import { ClubMatch } from "../../lib/types";
import { ClubCard } from "./ClubCard";

interface ClubListProps {
  matches: ClubMatch[];
}

export function ClubList({ matches }: ClubListProps) {
  if (matches.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          No club matches are available for this profile yet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {matches.map((match) => (
        <ClubCard key={match.club.id} match={match} />
      ))}
    </section>
  );
}
