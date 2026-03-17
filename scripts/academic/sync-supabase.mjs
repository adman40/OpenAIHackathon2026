import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { loadLiveAcademicCatalogs } from "./live-source-adapters.mjs";

const root = process.cwd();
const syncMode = process.argv.includes("--nightly") ? "nightly" : "initial-load";

function parseEnvFile(contents) {
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const unquotedValue = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && !(key in process.env)) {
      process.env[key] = unquotedValue;
    }
  }
}

async function loadLocalEnvFiles() {
  for (const fileName of [".env.local", ".env"]) {
    try {
      const contents = await fs.readFile(path.join(root, fileName), "utf8");
      parseEnvFile(contents);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Academic sync only runs against Supabase.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function insertImportRun(supabase) {
  const { data, error } = await supabase
    .from("academic_import_runs")
    .insert({
      source_name: "ut-live-academic-sources",
      sync_mode: syncMode,
      status: "running",
      notes:
        "Academic sync now imports live official UT degree plans, major listings, and course metadata outside transcript uploads.",
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function finishImportRun(supabase, runId, status, recordCounts, errorMessage = null) {
  const { error } = await supabase
    .from("academic_import_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      record_counts: recordCounts,
      error_message: errorMessage,
    })
    .eq("id", runId);

  if (error) {
    throw error;
  }
}

async function replaceRows(supabase, tableName, deleteFilters, rows, insertOptions = {}) {
  let deleteQuery = supabase.from(tableName).delete();

  for (const [column, value] of deleteFilters) {
    if (Array.isArray(value)) {
      deleteQuery = deleteQuery.in(column, value);
    } else {
      deleteQuery = deleteQuery.eq(column, value);
    }
  }

  const deleteResult = await deleteQuery;

  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (rows.length === 0) {
    return 0;
  }

  const insertResult = await supabase.from(tableName).insert(rows, insertOptions);

  if (insertResult.error) {
    throw insertResult.error;
  }

  return rows.length;
}

async function syncCourseCatalogs(supabase, courseCatalogs) {
  const catalogRows = courseCatalogs.map((catalog) => ({
    catalog_id: catalog.catalogId,
    degree_id: catalog.degreeId,
    source_metadata: catalog.sourceMetadata,
  }));
  const { error: catalogError } = await supabase
    .from("academic_course_catalogs")
    .upsert(catalogRows, { onConflict: "catalog_id" });

  if (catalogError) {
    throw catalogError;
  }

  let courseCount = 0;

  for (const catalog of courseCatalogs) {
    const rows = catalog.courses.map((course) => ({
      catalog_id: catalog.catalogId,
      course_id: course.courseId,
      course_name: course.courseName,
      requirement_bucket: course.requirementBucket,
      credits: course.credits,
      prerequisites: course.prerequisites,
      terms_offered: course.termsOffered,
      professor_name: course.professorName,
      professor_difficulty: course.professorDifficulty,
      grade_tendency: course.gradeTendency,
      attendance_policy: course.attendancePolicy,
    }));

    courseCount += await replaceRows(supabase, "academic_courses", [["catalog_id", catalog.catalogId]], rows);
  }

  return {
    courseCatalogs: catalogRows.length,
    courses: courseCount,
  };
}

async function syncMajors(supabase, majorsCatalog) {
  const { error: catalogError } = await supabase.from("academic_major_catalogs").upsert(
    [
      {
        catalog_id: majorsCatalog.catalogId,
        level: majorsCatalog.level,
        source_metadata: majorsCatalog.sourceMetadata,
      },
    ],
    { onConflict: "catalog_id" },
  );

  if (catalogError) {
    throw catalogError;
  }

  const majorRows = majorsCatalog.majors.map((major) => ({
    catalog_id: majorsCatalog.catalogId,
    major_id: major.majorId,
    display_name: major.displayName,
    college: major.college,
    level: major.level,
    support_status: major.supportStatus,
    normalized_plan_id: major.normalizedPlanId ?? null,
    degree_label: major.degreeLabel ?? null,
    specializations: major.specializations ?? [],
  }));

  const majorCount = await replaceRows(
    supabase,
    "academic_majors",
    [["catalog_id", majorsCatalog.catalogId]],
    majorRows,
  );

  return {
    majorCatalogs: 1,
    majors: majorCount,
  };
}

async function syncDegreePlans(supabase, degreePlanCatalog) {
  const { error: catalogError } = await supabase.from("academic_degree_plan_catalogs").upsert(
    [
      {
        catalog_id: degreePlanCatalog.catalogId,
        level: degreePlanCatalog.level,
        source_metadata: degreePlanCatalog.sourceMetadata,
      },
    ],
    { onConflict: "catalog_id" },
  );

  if (catalogError) {
    throw catalogError;
  }

  const deletePlansResult = await supabase
    .from("academic_degree_plans")
    .delete()
    .eq("catalog_id", degreePlanCatalog.catalogId);

  if (deletePlansResult.error) {
    throw deletePlansResult.error;
  }

  const planRows = degreePlanCatalog.plans.map((plan) => ({
    plan_id: plan.planId,
    catalog_id: degreePlanCatalog.catalogId,
    degree_id: plan.degreeId,
    major_id: plan.majorId,
    major_name: plan.majorName,
    aliases: plan.aliases,
    degree_name: plan.degreeName,
    college: plan.college,
    level: plan.level,
    total_credits: plan.totalCredits,
    course_catalog_id: plan.courseCatalogId,
    support_status: plan.supportStatus,
    source_metadata: plan.sourceMetadata,
  }));

  if (planRows.length > 0) {
    const insertPlansResult = await supabase.from("academic_degree_plans").insert(planRows);

    if (insertPlansResult.error) {
      throw insertPlansResult.error;
    }
  }

  const bucketRows = degreePlanCatalog.plans.flatMap((plan) =>
    plan.requirementBuckets.map((bucket, index) => ({
      plan_id: plan.planId,
      bucket_id: bucket.id,
      title: bucket.title,
      bucket_type: bucket.bucketType,
      credits_required: bucket.creditsRequired,
      course_ids: bucket.courses,
      notes: bucket.notes,
      sort_order: index,
    })),
  );

  if (bucketRows.length > 0) {
    const insertBucketsResult = await supabase.from("academic_requirement_buckets").insert(bucketRows);

    if (insertBucketsResult.error) {
      throw insertBucketsResult.error;
    }
  }

  return {
    degreePlanCatalogs: 1,
    degreePlans: planRows.length,
    requirementBuckets: bucketRows.length,
  };
}

async function syncSchedules(supabase, scheduleCatalog) {
  const { error: catalogError } = await supabase.from("academic_schedule_catalogs").upsert(
    [
      {
        catalog_id: scheduleCatalog.catalogId,
        level: scheduleCatalog.level,
        source_metadata: scheduleCatalog.sourceMetadata,
      },
    ],
    { onConflict: "catalog_id" },
  );

  if (catalogError) {
    throw catalogError;
  }

  const snapshotRows = scheduleCatalog.termSnapshots.map((snapshot) => ({
    schedule_catalog_id: scheduleCatalog.catalogId,
    course_catalog_id: snapshot.courseCatalogId,
    term: snapshot.term,
    is_regular_term: snapshot.isRegularTerm,
    offered_course_ids: snapshot.offeredCourseIds,
  }));

  const offeringCount = await replaceRows(
    supabase,
    "academic_term_offerings",
    [["schedule_catalog_id", scheduleCatalog.catalogId]],
    snapshotRows,
  );

  return {
    scheduleCatalogs: 1,
    termOfferings: offeringCount,
  };
}

async function syncEquivalencies(supabase, equivalencyArtifact) {
  const courseCatalogIds = Object.keys(equivalencyArtifact.equivalencies);
  const rows = courseCatalogIds.flatMap((courseCatalogId) =>
    Object.entries(equivalencyArtifact.equivalencies[courseCatalogId] ?? {}).map(
      ([sourceCourseId, equivalentCourseIds]) => ({
        course_catalog_id: courseCatalogId,
        source_course_id: sourceCourseId,
        equivalent_course_ids: equivalentCourseIds,
      }),
    ),
  );

  const equivalencyCount =
    courseCatalogIds.length === 0
      ? 0
      : await replaceRows(
          supabase,
          "academic_course_equivalencies",
          [["course_catalog_id", courseCatalogIds]],
          rows,
        );

  return {
    courseEquivalencies: equivalencyCount,
  };
}

export async function runAcademicSync() {
  await loadLocalEnvFiles();

  const supabase = getSupabaseAdminClient();
  const runId = await insertImportRun(supabase);
  const recordCounts = {};

  try {
    const artifacts = await loadLiveAcademicCatalogs();

    Object.assign(recordCounts, await syncCourseCatalogs(supabase, artifacts.courseCatalogs));
    Object.assign(recordCounts, await syncMajors(supabase, artifacts.majorsCatalog));
    Object.assign(recordCounts, await syncDegreePlans(supabase, artifacts.degreePlanCatalog));
    Object.assign(recordCounts, await syncSchedules(supabase, artifacts.scheduleCatalog));
    Object.assign(recordCounts, await syncEquivalencies(supabase, artifacts.equivalencyArtifact));

    await finishImportRun(supabase, runId, "completed", recordCounts);
    console.log("[hook] academic sync completed", { syncMode, recordCounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishImportRun(supabase, runId, "failed", recordCounts, message);
    throw error;
  }
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  runAcademicSync().catch((error) => {
    console.error("[hook] academic sync failed", error);
    process.exitCode = 1;
  });
}
