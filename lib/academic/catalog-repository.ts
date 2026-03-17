import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "../supabase/server";
import type {
  CourseCatalog,
  CourseEquivalencyCatalog,
  EligibleCourse,
  ImportedCourseScheduleCatalog,
  ImportedCourseScheduleTermSnapshot,
  NormalizedDegreePlan,
  NormalizedDegreePlanBucket,
  NormalizedDegreePlanCatalog,
  SourceMetadata,
  UTUndergraduateMajor,
  UTUndergraduateMajorsCatalog,
} from "../types";

const DEGREE_PLAN_CATALOG_ID = "ut-undergrad-degree-plans";
const MAJOR_CATALOG_ID = "ut-undergrad-majors";
const SCHEDULE_CATALOG_ID = "ut-undergrad-course-schedule";

type AcademicMajorCatalogRow = {
  catalog_id: string;
  level: string;
  source_metadata: SourceMetadata | null;
};

type AcademicMajorRow = {
  catalog_id: string;
  major_id: string;
  display_name: string;
  college: string;
  level: string;
  support_status: "supported" | "planned";
  normalized_plan_id: string | null;
  degree_label: string | null;
  specializations: string[] | null;
};

type AcademicDegreePlanCatalogRow = {
  catalog_id: string;
  level: string;
  source_metadata: SourceMetadata | null;
};

type AcademicDegreePlanRow = {
  plan_id: string;
  catalog_id: string;
  degree_id: string;
  major_id: string;
  major_name: string;
  aliases: string[] | null;
  degree_name: string;
  college: string;
  level: string;
  total_credits: number;
  course_catalog_id: string;
  support_status: "supported" | "planned";
  source_metadata: SourceMetadata | null;
};

type AcademicRequirementBucketRow = {
  plan_id: string;
  bucket_id: string;
  title: string;
  bucket_type: "core" | "major" | "elective";
  credits_required: number;
  course_ids: string[] | null;
  notes: string;
  sort_order: number;
};

type AcademicCourseCatalogRow = {
  catalog_id: string;
  degree_id: string;
  source_metadata: SourceMetadata | null;
};

type AcademicCourseRow = {
  catalog_id: string;
  course_id: string;
  course_name: string;
  requirement_bucket: "core" | "major" | "elective";
  credits: number;
  prerequisites: string[] | null;
  terms_offered: string[] | null;
  professor_name: string;
  professor_difficulty: string;
  grade_tendency: string;
  attendance_policy: string;
};

type AcademicScheduleCatalogRow = {
  catalog_id: string;
  level: string;
  source_metadata: SourceMetadata | null;
};

type AcademicTermOfferingRow = {
  schedule_catalog_id: string;
  course_catalog_id: string;
  term: string;
  is_regular_term: boolean;
  offered_course_ids: string[] | null;
};

type AcademicCourseEquivalencyRow = {
  course_catalog_id: string;
  source_course_id: string;
  equivalent_course_ids: string[] | null;
};

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeSourceMetadata(value: SourceMetadata | null | undefined): SourceMetadata {
  return {
    sourceName: value?.sourceName ?? "Hook academic sync",
    sourceUrl: value?.sourceUrl ?? "https://catalog.utexas.edu/",
    importedAt: value?.importedAt ?? new Date(0).toISOString(),
    notes: toStringArray(value?.notes),
  };
}

function requireAcademicSupabase(): SupabaseClient {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error(
      "Academic catalog data now requires Supabase. Configure Supabase and run `npm run sync:academic` before using academic analysis.",
    );
  }

  return supabase;
}

async function loadRequiredFromSupabase<T>(
  description: string,
  load: (supabase: SupabaseClient) => Promise<T | null>,
): Promise<T> {
  const result = await load(requireAcademicSupabase());

  if (result === null) {
    throw new Error(
      `Missing ${description} in Supabase. Run \`npm run sync:academic\` to import the live UT academic catalogs.`,
    );
  }

  return result;
}

function buildCourseEquivalencyCatalog(rows: AcademicCourseEquivalencyRow[]): CourseEquivalencyCatalog {
  const catalog: CourseEquivalencyCatalog = {};

  for (const row of rows) {
    catalog[row.course_catalog_id] ??= {};
    catalog[row.course_catalog_id][row.source_course_id] = toStringArray(row.equivalent_course_ids);
  }

  return catalog;
}

function buildRequirementBuckets(
  bucketRows: AcademicRequirementBucketRow[],
  planId: string,
): NormalizedDegreePlanBucket[] {
  return bucketRows
    .filter((bucket) => bucket.plan_id === planId)
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((bucket) => ({
      id: bucket.bucket_id,
      title: bucket.title,
      bucketType: bucket.bucket_type,
      creditsRequired: bucket.credits_required,
      courses: toStringArray(bucket.course_ids),
      notes: bucket.notes,
    }));
}

export async function loadCourseEquivalencyCatalogFromSource(): Promise<CourseEquivalencyCatalog> {
  const supabase = requireAcademicSupabase();
  const { data, error } = await supabase
    .from("academic_course_equivalencies")
    .select("course_catalog_id,source_course_id,equivalent_course_ids");

  if (error) {
    throw error;
  }

  return data && data.length > 0 ? buildCourseEquivalencyCatalog(data as AcademicCourseEquivalencyRow[]) : {};
}

export async function loadNormalizedDegreePlanCatalogFromSource(): Promise<NormalizedDegreePlanCatalog> {
  return loadRequiredFromSupabase("degree plan catalog", async (supabase) => {
    const [{ data: catalogRow, error: catalogError }, { data: planRows, error: plansError }] =
      await Promise.all([
        supabase
          .from("academic_degree_plan_catalogs")
          .select("catalog_id,level,source_metadata")
          .eq("catalog_id", DEGREE_PLAN_CATALOG_ID)
          .maybeSingle(),
        supabase
          .from("academic_degree_plans")
          .select(
            "plan_id,catalog_id,degree_id,major_id,major_name,aliases,degree_name,college,level,total_credits,course_catalog_id,support_status,source_metadata",
          )
          .eq("catalog_id", DEGREE_PLAN_CATALOG_ID),
      ]);

    if (catalogError) {
      throw catalogError;
    }

    if (plansError) {
      throw plansError;
    }

    if (!catalogRow || !planRows || planRows.length === 0) {
      return null;
    }

    const planIds = (planRows as AcademicDegreePlanRow[]).map((plan) => plan.plan_id);
    const { data: bucketRows, error: bucketError } = await supabase
      .from("academic_requirement_buckets")
      .select("plan_id,bucket_id,title,bucket_type,credits_required,course_ids,notes,sort_order")
      .in("plan_id", planIds);

    if (bucketError) {
      throw bucketError;
    }

    const plans: NormalizedDegreePlan[] = (planRows as AcademicDegreePlanRow[]).map((plan) => ({
      planId: plan.plan_id,
      degreeId: plan.degree_id,
      majorId: plan.major_id,
      majorName: plan.major_name,
      aliases: toStringArray(plan.aliases),
      degreeName: plan.degree_name,
      college: plan.college,
      level: "undergraduate",
      totalCredits: plan.total_credits,
      courseCatalogId: plan.course_catalog_id,
      supportStatus: plan.support_status,
      sourceMetadata: normalizeSourceMetadata(plan.source_metadata),
      requirementBuckets: buildRequirementBuckets(
        (bucketRows as AcademicRequirementBucketRow[] | null) ?? [],
        plan.plan_id,
      ),
    }));

    return {
      catalogId: catalogRow.catalog_id,
      level: "undergraduate",
      sourceMetadata: normalizeSourceMetadata((catalogRow as AcademicDegreePlanCatalogRow).source_metadata),
      plans,
    };
  });
}

export async function loadUndergradMajorsCatalogFromSource(): Promise<UTUndergraduateMajorsCatalog> {
  return loadRequiredFromSupabase("major catalog", async (supabase) => {
    const [{ data: catalogRow, error: catalogError }, { data: majorRows, error: majorsError }] =
      await Promise.all([
        supabase
          .from("academic_major_catalogs")
          .select("catalog_id,level,source_metadata")
          .eq("catalog_id", MAJOR_CATALOG_ID)
          .maybeSingle(),
        supabase
          .from("academic_majors")
          .select(
            "catalog_id,major_id,display_name,college,level,support_status,normalized_plan_id,degree_label,specializations",
          )
          .eq("catalog_id", MAJOR_CATALOG_ID),
      ]);

    if (catalogError) {
      throw catalogError;
    }

    if (majorsError) {
      throw majorsError;
    }

    if (!catalogRow || !majorRows || majorRows.length === 0) {
      return null;
    }

    const majors: UTUndergraduateMajor[] = (majorRows as AcademicMajorRow[]).map((major) => ({
      majorId: major.major_id,
      displayName: major.display_name,
      college: major.college,
      level: "undergraduate",
      supportStatus: major.support_status,
      normalizedPlanId: major.normalized_plan_id ?? undefined,
      degreeLabel: major.degree_label ?? undefined,
      specializations: toStringArray(major.specializations),
    }));

    return {
      catalogId: catalogRow.catalog_id,
      level: "undergraduate",
      sourceMetadata: normalizeSourceMetadata((catalogRow as AcademicMajorCatalogRow).source_metadata),
      majors,
    };
  });
}

export async function loadCourseCatalogFromSource(courseCatalogId: string): Promise<CourseCatalog> {
  return loadRequiredFromSupabase(`course catalog ${courseCatalogId}`, async (supabase) => {
    const [{ data: catalogRow, error: catalogError }, { data: courseRows, error: coursesError }] =
      await Promise.all([
        supabase
          .from("academic_course_catalogs")
          .select("catalog_id,degree_id,source_metadata")
          .eq("catalog_id", courseCatalogId)
          .maybeSingle(),
        supabase
          .from("academic_courses")
          .select(
            "catalog_id,course_id,course_name,requirement_bucket,credits,prerequisites,terms_offered,professor_name,professor_difficulty,grade_tendency,attendance_policy",
          )
          .eq("catalog_id", courseCatalogId),
      ]);

    if (catalogError) {
      throw catalogError;
    }

    if (coursesError) {
      throw coursesError;
    }

    if (!catalogRow || !courseRows || courseRows.length === 0) {
      return null;
    }

    const courses: EligibleCourse[] = (courseRows as AcademicCourseRow[]).map((course) => ({
      courseId: course.course_id,
      courseName: course.course_name,
      requirementBucket: course.requirement_bucket,
      credits: course.credits,
      prerequisites: toStringArray(course.prerequisites),
      termsOffered: toStringArray(course.terms_offered),
      professorName: course.professor_name,
      professorDifficulty: course.professor_difficulty,
      gradeTendency: course.grade_tendency,
      attendancePolicy: course.attendance_policy,
    }));

    return {
      catalogId: catalogRow.catalog_id,
      degreeId: (catalogRow as AcademicCourseCatalogRow).degree_id,
      courses,
    };
  });
}

export async function loadImportedScheduleCatalogFromSource(): Promise<ImportedCourseScheduleCatalog> {
  return loadRequiredFromSupabase("course schedule catalog", async (supabase) => {
    const [{ data: catalogRow, error: catalogError }, { data: snapshotRows, error: snapshotsError }] =
      await Promise.all([
        supabase
          .from("academic_schedule_catalogs")
          .select("catalog_id,level,source_metadata")
          .eq("catalog_id", SCHEDULE_CATALOG_ID)
          .maybeSingle(),
        supabase
          .from("academic_term_offerings")
          .select("schedule_catalog_id,course_catalog_id,term,is_regular_term,offered_course_ids")
          .eq("schedule_catalog_id", SCHEDULE_CATALOG_ID),
      ]);

    if (catalogError) {
      throw catalogError;
    }

    if (snapshotsError) {
      throw snapshotsError;
    }

    if (!catalogRow || !snapshotRows || snapshotRows.length === 0) {
      return null;
    }

    const termSnapshots: ImportedCourseScheduleTermSnapshot[] = (
      snapshotRows as AcademicTermOfferingRow[]
    ).map((snapshot) => ({
      courseCatalogId: snapshot.course_catalog_id,
      term: snapshot.term,
      isRegularTerm: snapshot.is_regular_term,
      offeredCourseIds: toStringArray(snapshot.offered_course_ids),
    }));

    return {
      catalogId: catalogRow.catalog_id,
      level: "undergraduate",
      sourceMetadata: normalizeSourceMetadata((catalogRow as AcademicScheduleCatalogRow).source_metadata),
      termSnapshots,
    };
  });
}
