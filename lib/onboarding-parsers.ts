import type { CompletedCourse } from "./types";

const SKILL_KEYWORDS = [
  "python",
  "typescript",
  "javascript",
  "react",
  "sql",
  "java",
  "c++",
  "machine learning",
  "data analysis",
  "figma",
  "product design",
  "leadership",
  "public speaking",
  "research",
] as const;

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export async function parseTranscriptFile(file: File, major: string) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("documentType", "transcript");
  formData.set("major", major);

  try {
    const response = await fetch("/api/profile/parse-document", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcript parse failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      courses: CompletedCourse[];
      gpa: number | null;
      usedFallback: boolean;
      extractedTextLength: number;
      parser: "ai" | "deterministic";
    };

    console.log("[hook] parseTranscriptFile server payload", {
      fileName: file.name,
      parser: payload.parser,
      usedFallback: payload.usedFallback,
      extractedTextLength: payload.extractedTextLength,
      courseCount: payload.courses.length,
      courses: payload.courses.map((course) => course.courseId),
      gpa: payload.gpa,
    });

    return payload;
  } catch (error) {
    console.warn("[hook] parseTranscriptFile failed", {
      fileName: file.name,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof Error ? error : new Error("Transcript parse failed.");
  }
}

export async function parseResumeFile(file: File, major: string) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("documentType", "resume");
  formData.set("major", major);

  try {
    const response = await fetch("/api/profile/parse-document", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Resume parse failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      skills: string[];
      summary: string;
      usedFallback: boolean;
      extractedTextLength: number;
      parser: "ai" | "deterministic" | "fallback";
    };

    console.log("[hook] parseResumeFile server payload", {
      fileName: file.name,
      parser: payload.parser,
      usedFallback: payload.usedFallback,
      extractedTextLength: payload.extractedTextLength,
      skills: payload.skills,
      summaryPreview: payload.summary.slice(0, 160),
    });

    return payload;
  } catch (error) {
    console.warn("[hook] parseResumeFile fell back to browser parsing", {
      fileName: file.name,
      error: error instanceof Error ? error.message : String(error),
    });

    const isTextReadable = file.type.startsWith("text/") || /\.(txt|md|json)$/i.test(file.name);
    const rawText = isTextReadable ? await file.text() : "";
    const text = normalizeWhitespace(rawText);
    const lower = text.toLowerCase();
    const skills = SKILL_KEYWORDS.filter((skill) => lower.includes(skill)).slice(0, 8);

    const seededSkills =
      skills.length > 0
        ? skills
        : major === "Business Administration"
          ? ["leadership", "data analysis", "public speaking"]
          : major === "Biology"
            ? ["research", "data analysis", "public speaking"]
            : ["python", "typescript", "sql"];

    return {
      skills: seededSkills,
      summary:
        text.slice(0, 220) ||
        `${major} student with a browser-safe resume fallback. Skills were seeded so the demo stays coherent when the uploaded file is not text-readable yet.`,
      usedFallback: text.length === 0,
      extractedTextLength: text.length,
      parser: skills.length > 0 || text.length > 0 ? "deterministic" : "fallback",
    };
  }
}

export async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to preview the selected image."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}
