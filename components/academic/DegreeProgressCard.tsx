interface DegreeProgressCardProps {
  percentComplete: number;
  estimatedGraduationSemester: string;
}

export function DegreeProgressCard({
  percentComplete,
  estimatedGraduationSemester,
}: DegreeProgressCardProps) {
  return (
    <section className="rounded-xl border border-orange-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-orange-700">Degree Progress</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {percentComplete}% complete
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Estimated graduation: {estimatedGraduationSemester}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 px-3 py-2 text-right">
          <p className="text-xs uppercase tracking-wide text-orange-700">
            On-track signal
          </p>
          <p className="text-lg font-semibold text-orange-900">
            {percentComplete >= 75 ? "Strong" : percentComplete >= 45 ? "Steady" : "Early build"}
          </p>
        </div>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-orange-500 transition-all"
          style={{ width: `${Math.max(0, Math.min(percentComplete, 100))}%` }}
        />
      </div>
    </section>
  );
}
