import { Recommendation } from "../../lib/types";

interface RecommendationSectionProps {
  title: string;
  emptyMessage: string;
  recommendations: Recommendation[];
}

const URGENCY_STYLES: Record<Recommendation["urgency"], string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  recommended: "bg-orange-100 text-orange-800 border-orange-200",
  optional: "bg-slate-100 text-slate-700 border-slate-200",
};

export function RecommendationSection({
  title,
  emptyMessage,
  recommendations,
}: RecommendationSectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <span className="text-sm text-slate-500">{recommendations.length} items</span>
      </div>

      {recommendations.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">{emptyMessage}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {recommendations.map((recommendation) => (
            <article
              key={recommendation.courseId}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {recommendation.courseId}
                  </p>
                  <p className="text-sm text-slate-600">
                    {recommendation.courseName}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${URGENCY_STYLES[recommendation.urgency]}`}
                >
                  {recommendation.urgency}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-700">{recommendation.rationale}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
