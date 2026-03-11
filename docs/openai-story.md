# OpenAI Story

## Goal

Explain how OpenAI tools were central to building Hook, not just embedded as a feature.

## Team Ownership

- Person A: platform, onboarding, dashboard, chat, docs, integration
- Person B: academic engine, degree data, clubs
- Person C: scholarships, research, internships, opportunity data

## Three-Worktree Setup

- `main`: Person A
- `feat/academic-clubs`: Person B
- `feat/opportunities`: Person C

## Screenshot Checklist

- `codex-log-01-types.png`
- `codex-log-02-academic-engine.png`
- `codex-log-02-academic-data.png`
- `codex-log-02b-academic-ui.png`
- `codex-log-03-scholarships.png`
- `codex-log-04-clubs.png`
- `codex-log-05-opportunities.png`
- `codex-log-06-chat.png`
- `codex-log-07-three-worktrees.png`

## Major Files Codex Should Generate

- shared types and onboarding flow
- academic engine and academic UI
- scholarship and opportunity matchers
- clubs matcher and UI
- chat route and chat UI
- demo and pitch documentation

## Notes To Fill In During Build

- Which files Codex created directly
- Which files humans edited after review
- Where Codex saved time in parallel worktrees
- Structured academic data generation made it easy to demo degree progress, prereq alerts, and course recommendations with consistent JSON inputs.

## Academic UI Note

The academic UI translated the engine output into a scan-friendly story for judges: one page shows progress at a glance, surfaces the biggest prereq blocker, separates core and major next steps, and keeps the eligible course list easy to narrate during the live demo.

## Clubs Note

The clubs feature stayed intentionally lightweight so it could answer one useful question fast: "Which organizations fit this student right now?" A single ranked list with short reasons, meeting cadence, and join links keeps community fit visible without turning the demo into a second full planner.

## Academic And Clubs Technical Summary

The academic engine reads local degree requirements and course catalogs, computes percent complete, ranks eligible courses, and surfaces prereq alerts when one missing course can delay a larger sequence. Those alerts are deterministic and explainable because they come directly from the prerequisite graph in the curated course metadata. The club matcher uses the same profile-first approach: it scores organizations with a simple deterministic formula based on interests, major fit, career goal, and weekly time availability, then returns short reasons that make each recommendation easy to justify in front of judges.

## Build Notes

### A2 - Profile System and Demo Mode

- Codex generated the shared profile state layer in `lib/profile-context.tsx`.
- Codex generated the multi-step onboarding UI in `components/profile/ProfileForm.tsx`.
- Codex generated the onboarding route in `app/onboarding/page.tsx`.
- Codex mounted the profile provider in `app/layout.tsx` so the onboarding flow and dashboard can share one session-backed profile at runtime.
- This phase matters because the same student profile now powers every Hook surface instead of each page inventing its own data.
- Screenshot to save: `codex-log-01b-profile.png`

### A4 - Chat Layer

- Codex generated the local campus resource knowledge file in `data/resources/campus-resources.md`.
- Codex generated the demo sports context file in `data/resources/sports-snapshot.json`.
- Codex generated `pages/api/chat/respond.ts`, which builds a system prompt from `StudentProfile` plus local files and uses GPT-4o when an API key is available.
- The chat route is intentionally demo-safe: if the OpenAI call fails or no API key is set, Hook falls back to local deterministic guidance instead of breaking.
- Codex generated the chat UI in `components/chat/MessageBubble.tsx`, `components/chat/ChatInput.tsx`, and `components/chat/ChatWindow.tsx`.
- Core chat use cases:
  - campus resources
  - study strategy
  - mental-health and crisis routing
  - sports snapshot questions
  - cold outreach drafting
- Screenshot to save: `codex-log-06-chat.png`

## Scholarship Matcher (Person C)

- Dataset file: `data/scholarships/scholarships.json` (16 scholarships, UT + external mix).
- Matching engine: `lib/matchers/scholarship-matcher.ts`.
- API route: `pages/api/scholarships/match.ts`.
- Fit scoring dimensions:
  - residency
  - major
  - year (inferred from resume summary or completed-course count)
  - GPA band
  - financial need
  - career goal
  - resume/skills overlap
  - specificity of fit (how many scholarship-specific constraints the student satisfies)
- Output contract: `ScholarshipMatch[]` with `fitScore`, `matchReasons`, `deadline`, `isUrgent`, and full `scholarship`.
- Evidence screenshot: `codex-log-03-scholarships.png`.

## Shared Opportunity Matcher (Person C)

- Dataset files:
  - `data/opportunities/research.json`
  - `data/opportunities/internships.json`
- Shared matching engine: `lib/matchers/opportunity-matcher.ts`.
- API routes:
  - `pages/api/research/match.ts`
  - `pages/api/internships/match.ts`
- Fit scoring dimensions:
  - major
  - completed courses
  - resume summary
  - skills
  - interests
  - preferred locations
  - preferred terms
- Output contract: `OpportunityMatch[]` with `fitScore`, `matchReasons`, and full `opportunity`.
- Evidence screenshot: `codex-log-05-opportunities.png`.

## Technical Summary (Opportunity Stack)

- Scholarship matcher (`lib/matchers/scholarship-matcher.ts`): Parses scholarship eligibility signals and computes weighted fit across residency, major, inferred year, GPA band, financial need, career goal, and resume/skills overlap; also adds specificity bonuses and deadline urgency.
- Research matcher (`lib/matchers/opportunity-matcher.ts` via `pages/api/research/match.ts`): Uses shared opportunity scoring with research dataset inputs, emphasizing major fit, relevant completed coursework, skills/resume alignment, interests, and preferred location/term compatibility.
- Internship matcher (`lib/matchers/opportunity-matcher.ts` via `pages/api/internships/match.ts`): Reuses the same scoring pipeline on internship data so ranking behavior is consistent across opportunity surfaces while allowing UI-layer filters for location, pay band, and term.

## Technical Summary (Chat Stack)

- Model usage: GPT-4o via the OpenAI Node SDK in `pages/api/chat/respond.ts`.
- Grounding strategy: a system prompt built from the active `StudentProfile`, `data/resources/campus-resources.md`, and `data/resources/sports-snapshot.json`.
- Safety and demo reliability: no vector database, no live scraping, and a local fallback path if the model call is unavailable.
- Explainability: the route returns `ChatResponse` with `answer`, `suggestedActions`, and `citations` so the UI can show why a response was generated.
