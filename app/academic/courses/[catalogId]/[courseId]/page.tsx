import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseDetailCard } from "../../../../../components/academic/CourseDetailCard";
import { loadCourseDetail } from "../../../../../lib/academic/course-detail-loader";

interface AcademicCourseDetailPageProps {
  params: {
    catalogId: string;
    courseId: string;
  };
  searchParams: {
    term?: string | string[];
  };
}

function getSearchParamValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function AcademicCourseDetailPage({
  params,
  searchParams,
}: AcademicCourseDetailPageProps) {
  const detail = await loadCourseDetail(
    decodeURIComponent(params.catalogId),
    decodeURIComponent(params.courseId),
    getSearchParamValue(searchParams.term),
  );

  if (!detail) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/academic"
          className="inline-flex items-center text-sm font-medium text-orange-700 transition hover:text-orange-800"
        >
          Back to academic planner
        </Link>
        <CourseDetailCard detail={detail} />
      </div>
    </main>
  );
}
