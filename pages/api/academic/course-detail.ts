import type { NextApiRequest, NextApiResponse } from "next";

import { loadCourseDetail } from "../../../lib/academic/course-detail-loader";
import type { CourseDetail } from "../../../lib/types";

type CourseDetailResponse =
  | CourseDetail
  | {
      error: string;
    };

function getQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CourseDetailResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const catalogId = getQueryValue(req.query.catalogId);
  const courseId = getQueryValue(req.query.courseId);
  const term = getQueryValue(req.query.term);

  if (!catalogId || !courseId) {
    return res.status(400).json({ error: "catalogId and courseId are required." });
  }

  try {
    const detail = await loadCourseDetail(catalogId, courseId, term);

    if (!detail) {
      return res.status(404).json({ error: "Course not found." });
    }

    return res.status(200).json(detail);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown course detail error";

    return res.status(500).json({ error: message });
  }
}
