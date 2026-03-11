import { StudentProfile } from "../../lib/types";
import { formatNumericGpa } from "../../lib/transcript/gpa";

interface PublicAcademicSummaryCardProps {
  profile: StudentProfile;
  summary: string;
}

export function PublicAcademicSummaryCard({
  profile,
  summary,
}: PublicAcademicSummaryCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">Profile snapshot</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">
        Academic Summary
      </h1>
      <p className="mt-2 text-sm text-slate-700">{summary}</p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Student</dt>
          <dd className="mt-1 font-medium text-slate-900">{profile.name}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Major</dt>
          <dd className="mt-1 font-medium text-slate-900">{profile.major}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Current semester</dt>
          <dd className="mt-1 font-medium text-slate-900">{profile.currentSemester}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">GPA</dt>
          <dd className="mt-1 font-medium text-slate-900">{formatNumericGpa(profile.gpa)}</dd>
        </div>
      </dl>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Completed courses
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {profile.completedCourses.map((course) => (
            <span
              key={course.courseId}
              className="rounded-full bg-orange-50 px-3 py-1 text-sm text-orange-800"
            >
              {course.courseId} {course.grade}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
