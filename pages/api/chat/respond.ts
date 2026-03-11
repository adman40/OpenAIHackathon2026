import { promises as fs } from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

import type { ChatCitation, ChatResponse, StudentProfile } from "../../../lib/types";
import { formatNumericGpa } from "../../../lib/transcript/gpa";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  profile?: StudentProfile;
};

type SportsSnapshot = {
  snapshotLabel: string;
  generatedForDemo: string;
  campus: string;
  sports: Array<{
    sport: string;
    headline: string;
    notes: string[];
  }>;
};

type ChatRouteResponse = ChatResponse | { error: string };

type ParsedModelResponse = {
  answer?: string;
  suggestedActions?: string[];
};

type ResourceSection = {
  title: string;
  body: string;
};

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function parseCampusSections(markdown: string): ResourceSection[] {
  return markdown
    .split(/^##\s+/m)
    .slice(1)
    .map((block) => {
      const lines = block.trim().split("\n");
      const title = lines[0]?.trim() ?? "Campus Resources";
      const body = lines.slice(1).join("\n").trim();
      return { title, body };
    })
    .filter((section) => section.title && section.body);
}

function inferTopic(message: string): string {
  const lower = normalize(message);

  if (
    /(sports|football|basketball|game|team|season|tournament|longhorns)/.test(lower)
  ) {
    return "sports";
  }

  if (
    /(outreach|email|draft|cold email|professor|recruiter|mentor|network)/.test(lower)
  ) {
    return "outreach";
  }

  if (
    /(mental health|panic|depressed|anxious|overwhelmed|burned out|crisis|self-harm|suicid)/.test(
      lower
    )
  ) {
    return "mental-health";
  }

  if (/(study|midterm|final|exam|focus|tutoring|office hours|class strategy)/.test(lower)) {
    return "study";
  }

  if (/(food|emergency|rent|housing|hardship|basic needs|grocer|pantry)/.test(lower)) {
    return "basic-needs";
  }

  if (/(advising|advisor|registration|degree|graduation|financial aid|services)/.test(lower)) {
    return "advising";
  }

  return "resources";
}

function sectionMatchesTopic(section: ResourceSection, topic: string): boolean {
  const title = normalize(section.title);

  if (topic === "study") {
    return title.includes("study spaces") || title.includes("tutoring");
  }

  if (topic === "mental-health") {
    return title.includes("mental health");
  }

  if (topic === "basic-needs") {
    return title.includes("food") || title.includes("emergency");
  }

  if (topic === "advising") {
    return title.includes("advising");
  }

  return true;
}

function buildCitations(topic: string, sections: ResourceSection[], sports: SportsSnapshot): ChatCitation[] {
  const citations: ChatCitation[] = [];

  sections
    .filter((section) => sectionMatchesTopic(section, topic))
    .slice(0, 2)
    .forEach((section) => {
      citations.push({
        label: section.title,
        sourceType: "resource",
        note: "Curated local campus-support guidance",
      });
    });

  if (topic === "sports") {
    citations.unshift({
      label: `${sports.campus} sports snapshot`,
      sourceType: "sports",
      note: sports.snapshotLabel,
    });
  }

  return citations.slice(0, 3);
}

function buildOutreachDraft(profile: StudentProfile, question: string): string {
  return [
    "Here is a concise outreach draft you can customize:",
    "",
    `Subject: ${profile.major} student interested in learning more`,
    "",
    "Hi [Name],",
    "",
    `I'm ${profile.name}, a ${profile.currentSemester} ${profile.major} student. ${profile.resumeSummary}`,
    `I'm reaching out because ${question.replace(/\?+$/, "")}.`,
    "If you're open to it, I'd appreciate 15 minutes to learn about your work and how a student like me could prepare well.",
    "",
    "Thanks for your time,",
    profile.name,
  ].join("\n");
}

function buildFallbackResponse(
  topic: string,
  question: string,
  profile: StudentProfile,
  sections: ResourceSection[],
  sports: SportsSnapshot
): ChatResponse {
  const citations = buildCitations(topic, sections, sports);

  if (topic === "sports") {
    const topLines = sports.sports
      .slice(0, 2)
      .map((entry) => `${entry.sport}: ${entry.headline}`)
      .join(" ");

    return {
      answer: `Here is the local demo sports snapshot for ${sports.campus}: ${topLines} This is curated demo data, so I would not treat it as a live score or official schedule feed.`,
      suggestedActions: [
        "Use this as a campus-life snapshot, not a live update",
        "Ask for a quick summary of one team",
        "Switch back to academic or opportunity questions when ready",
      ],
      citations,
    };
  }

  if (topic === "outreach") {
    return {
      answer: buildOutreachDraft(profile, question),
      suggestedActions: [
        "Replace [Name] with a real contact",
        "Add one specific reason you chose them",
        "Pair the draft with your resume or project link",
      ],
      citations,
    };
  }

  if (topic === "mental-health") {
    return {
      answer:
        "If this feels urgent, contact immediate support now: call or text 988, and if someone is in immediate danger call 911. For non-emergency support, start with campus counseling and mental-health services, and reach out to one trusted person today so you are not handling it alone.",
      suggestedActions: [
        "Contact 988 or emergency services if there is immediate danger",
        "Reach out to campus counseling support today",
        "Text or call one trusted person and tell them you need support",
      ],
      citations,
    };
  }

  if (topic === "basic-needs") {
    return {
      answer:
        "For urgent practical support, I would start with the campus food or basic-needs center today, then contact emergency aid or Dean of Students support if the situation is affecting housing, meals, or class attendance.",
      suggestedActions: [
        "Contact the food or basic-needs office today",
        "Escalate to emergency aid if the issue is affecting classes",
        "Write down the exact problem before calling so the office can route you faster",
      ],
      citations,
    };
  }

  if (topic === "advising") {
    return {
      answer:
        "Start with academic advising if your question mixes registration, degree progress, and timelines. If financial aid is part of the problem, bring that context and ask whether you should be handed off to the aid office after the advising conversation.",
      suggestedActions: [
        "Book advising first",
        "Bring a short written list of questions",
        "Add financial-aid follow-up if money affects your schedule decisions",
      ],
      citations,
    };
  }

  if (topic === "study") {
    return {
      answer: `For a ${profile.major} student in ${profile.currentSemester}, I would keep this simple: pick one quiet study space, use tutoring or office hours for the hardest course, and turn the next 7 days into a concrete study plan instead of trying to fix the whole semester at once.`,
      suggestedActions: [
        "Reserve one focused study block today",
        "Use tutoring or office hours for the hardest class",
        "Ask me for a 1-week study plan if you want it drafted",
      ],
      citations,
    };
  }

  return {
    answer:
      "I can help route you to campus support, study help, advising, emergency resources, sports snapshot context, or a cold outreach draft. Ask one concrete question and I will narrow it to the next best step.",
    suggestedActions: [
      "Ask for a campus resource",
      "Ask for a study strategy plan",
      "Ask for an outreach draft",
    ],
    citations,
  };
}

function sanitizeJson(text: string | null | undefined): string {
  if (!text) {
    return "{}";
  }

  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
}

function parseModelResponse(text: string | null | undefined): ParsedModelResponse {
  try {
    const parsed = JSON.parse(sanitizeJson(text)) as ParsedModelResponse;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function profileSummary(profile: StudentProfile): string {
  return [
    `Name: ${profile.name}`,
    `Major: ${profile.major}`,
    `Semester: ${profile.currentSemester}`,
    `Career goal: ${profile.careerGoal}`,
    `GPA: ${formatNumericGpa(profile.gpa)}`,
    `Financial need: ${profile.financialNeed}`,
    `Residency: ${profile.residency}`,
    `Skills: ${profile.skills.join(", ")}`,
    `Interests: ${profile.interests.join(", ")}`,
    `Preferred locations: ${profile.preferredLocations.join(", ")}`,
    `Preferred terms: ${profile.preferredTerms.join(", ")}`,
    `Resume summary: ${profile.resumeSummary}`,
  ].join("\n");
}

async function readCampusResources(): Promise<string> {
  const filePath = path.join(process.cwd(), "data", "resources", "campus-resources.md");
  return fs.readFile(filePath, "utf8");
}

async function readSportsSnapshot(): Promise<SportsSnapshot> {
  const filePath = path.join(process.cwd(), "data", "resources", "sports-snapshot.json");
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as SportsSnapshot;
}

async function generateModelAnswer(
  messages: ChatMessage[],
  profile: StudentProfile,
  campusResources: string,
  sportsSnapshot: SportsSnapshot
): Promise<ParsedModelResponse> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are Hook, a profile-aware college admin co-pilot.",
          "Use only the provided student profile and the local resource files below.",
          "Never invent offices, schedules, or policies beyond the local files.",
          "For mental-health or crisis questions: do not diagnose; route to urgent support and emergency help when appropriate.",
          "For sports questions: clearly state that the sports file is curated demo data, not a live feed.",
          "For outreach requests: write concise practical drafts.",
          "Return strict JSON with keys: answer (string), suggestedActions (array of 2-3 short strings).",
          "",
          "Student profile:",
          profileSummary(profile),
          "",
          "Campus resources markdown:",
          campusResources,
          "",
          "Sports snapshot JSON:",
          JSON.stringify(sportsSnapshot),
        ].join("\n"),
      },
      ...messages.slice(-8).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
  });

  return parseModelResponse(completion.choices[0]?.message?.content);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatRouteResponse>
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const body = req.body as ChatRequestBody;
    const messages = body.messages?.filter(
      (message): message is ChatMessage =>
        (message?.role === "user" || message?.role === "assistant") &&
        typeof message?.content === "string" &&
        message.content.trim().length > 0
    );
    const profile = body.profile;

    if (!messages || messages.length === 0) {
      res.status(400).json({ error: "Missing chat messages in request body." });
      return;
    }

    if (!profile) {
      res.status(400).json({ error: "Missing profile in request body." });
      return;
    }

    const [campusResources, sportsSnapshot] = await Promise.all([
      readCampusResources(),
      readSportsSnapshot(),
    ]);

    const sections = parseCampusSections(campusResources);
    const latestQuestion = messages[messages.length - 1]?.content ?? "";
    const topic = inferTopic(latestQuestion);
    const fallback = buildFallbackResponse(topic, latestQuestion, profile, sections, sportsSnapshot);

    if (!process.env.OPENAI_API_KEY) {
      res.status(200).json(fallback);
      return;
    }

    try {
      const modelResponse = await generateModelAnswer(
        messages,
        profile,
        campusResources,
        sportsSnapshot
      );

      res.status(200).json({
        answer: modelResponse.answer?.trim() || fallback.answer,
        suggestedActions:
          modelResponse.suggestedActions?.filter(Boolean).slice(0, 3) || fallback.suggestedActions,
        citations: fallback.citations,
      });
    } catch (error) {
      console.error("Chat generation failed, returning fallback:", error);
      res.status(200).json(fallback);
    }
  } catch (error) {
    console.error("Chat respond route failed:", error);
    res.status(500).json({ error: "Failed to generate chat response." });
  }
}
