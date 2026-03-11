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
      <div>
        <p className="text-sm font-medium text-orange-700">Degree Progress</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          {percentComplete}% Complete
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Estimated graduation: {estimatedGraduationSemester}
        </p>
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
