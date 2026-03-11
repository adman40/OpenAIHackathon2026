import Link from "next/link";

import type { CourseDetail } from "../../lib/types";

interface CourseDetailCardProps {
  detail: CourseDetail;
}

export function CourseDetailCard({ detail }: CourseDetailCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-orange-700">Academic course detail</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            {detail.courseId}: {detail.courseName}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {detail.credits} credits · {detail.requirementBucket} requirement
            {detail.nextTerm ? ` · next regular term: ${detail.nextTerm}` : ""}
          </p>
        </div>
        <Link
          href={detail.officialCourseListingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
        >
          Official UT listing
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Course description</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{detail.description}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Grade tendency summary</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{detail.gradeTendencySummary}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Prerequisites</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {detail.prerequisites.length > 0 ? (
                detail.prerequisites.map((prerequisite) => (
                  <span
                    key={prerequisite}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {prerequisite}
                  </span>
                ))
              ) : (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
                  No listed prerequisite
                </span>
              )}
            </div>
          </section>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Available professors for the next term</h2>
          {detail.availableProfessors.length > 0 ? (
            <div className="mt-3 space-y-3">
              {detail.availableProfessors.map((professor) => (
                <article
                  key={professor.professorName}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <a
                    href={professor.rateMyProfessorsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:text-orange-700"
                  >
                    {professor.professorName}
                  </a>
                  <p className="mt-2 text-sm text-slate-700">
                    Rate My Professor aggregate: {professor.rateMyProfessorRating.toFixed(1)}/5
                    {" · "}
                    {professor.reviewCount} reviews
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{professor.difficultySummary}</p>
                  <p className="mt-3 text-sm text-slate-700">
                    {professor.gradeTendencySummary}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              No professor data found for this course.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
