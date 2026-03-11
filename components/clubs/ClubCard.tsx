import { ClubMatch } from "../../lib/types";

interface ClubCardProps {
  match: ClubMatch;
}

export function ClubCard({ match }: ClubCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-orange-700">{match.club.category}</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{match.club.name}</h3>
          <p className="mt-2 text-sm text-slate-600">{match.club.description}</p>
        </div>
        <div className="rounded-lg bg-orange-50 px-3 py-2 text-right">
          <p className="text-xs uppercase tracking-wide text-orange-700">Fit score</p>
          <p className="text-xl font-semibold text-orange-900">{match.fitScore}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {match.matchReasons.map((reason) => (
          <p
            key={reason}
            className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
          >
            {reason}
          </p>
        ))}
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Meeting cadence</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{match.meetingCadence}</dd>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Time commitment</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{match.timeCommitment}</dd>
        </div>
      </dl>

      <a
        className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        href={match.club.joinLink}
        rel="noreferrer"
        target="_blank"
      >
        Open join link
      </a>
    </article>
  );
}
