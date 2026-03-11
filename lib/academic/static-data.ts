import biologyCatalog from "../../data/courses/biology-catalog.json";
import businessCatalog from "../../data/courses/business-catalog.json";
import csCatalog from "../../data/courses/cs-catalog.json";
import csbCatalog from "../../data/courses/csb-catalog.json";
import eceCatalog from "../../data/courses/ece-catalog.json";
import courseScheduleCatalog from "../../data/ut/course-schedule.json";
import undergradDegreePlanCatalog from "../../data/ut/undergrad-degree-plans.json";

import type {
  CourseCatalog,
  ImportedCourseScheduleCatalog,
  NormalizedDegreePlanCatalog,
} from "../types";

const COURSE_CATALOGS: Record<string, CourseCatalog> = {
  "biology-catalog": biologyCatalog as CourseCatalog,
  "business-catalog": businessCatalog as CourseCatalog,
  "cs-catalog": csCatalog as CourseCatalog,
  "csb-catalog": csbCatalog as CourseCatalog,
  "ece-catalog": eceCatalog as CourseCatalog,
};

export function getUndergradDegreePlanCatalog(): NormalizedDegreePlanCatalog {
  return undergradDegreePlanCatalog as NormalizedDegreePlanCatalog;
}

export function getImportedCourseScheduleCatalog(): ImportedCourseScheduleCatalog {
  return courseScheduleCatalog as ImportedCourseScheduleCatalog;
}

export function getCourseCatalog(courseCatalogId: string): CourseCatalog | null {
  return COURSE_CATALOGS[courseCatalogId] ?? null;
}
