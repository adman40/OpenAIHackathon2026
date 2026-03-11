import { EligibleCourse } from "../../lib/types";

interface EligibleCoursesTableProps {
  courses: EligibleCourse[];
}

export function EligibleCoursesTable({ courses }: EligibleCoursesTableProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Eligible Courses</h3>
          <p className="text-sm text-slate-600">
            Next regular term only, ranked by requirement fit, downstream unlocks, and professor signal.
          </p>
        </div>
        <span className="text-sm text-slate-500">{courses.length} courses</span>
      </div>

      {courses.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No courses are currently both next-term scheduled and fully unlocked from this profile snapshot.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="py-3 pr-4 font-medium">Course</th>
                <th className="py-3 pr-4 font-medium">Bucket</th>
                <th className="py-3 pr-4 font-medium">Credits</th>
                <th className="py-3 pr-4 font-medium">Terms</th>
                <th className="py-3 pr-4 font-medium">Professor</th>
                <th className="py-3 pr-4 font-medium">Difficulty</th>
                <th className="py-3 pr-4 font-medium">Grade tendency</th>
                <th className="py-3 font-medium">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((course) => (
                <tr key={course.courseId} className="align-top text-slate-700">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-900">{course.courseId}</div>
                    <div className="text-slate-600">{course.courseName}</div>
                    {course.eligibilityReason ? (
                      <div className="mt-1 max-w-md text-xs text-slate-500">
                        {course.eligibilityReason}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 capitalize">{course.requirementBucket}</td>
                  <td className="py-3 pr-4">{course.credits}</td>
                  <td className="py-3 pr-4">{course.termsOffered.join(", ")}</td>
                  <td className="py-3 pr-4">{course.professorName}</td>
                  <td className="py-3 pr-4">{course.professorDifficulty}</td>
                  <td className="py-3 pr-4">{course.gradeTendency}</td>
                  <td className="py-3">{course.attendancePolicy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
