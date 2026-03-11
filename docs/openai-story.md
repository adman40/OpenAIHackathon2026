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

## Build Notes

### A2 - Profile System and Demo Mode

- Codex generated the shared profile state layer in `lib/profile-context.tsx`.
- Codex generated the multi-step onboarding UI in `components/profile/ProfileForm.tsx`.
- Codex generated the onboarding route in `app/onboarding/page.tsx`.
- Codex mounted the profile provider in `app/layout.tsx` so the onboarding flow and dashboard can share one session-backed profile at runtime.
- This phase matters because the same student profile now powers every Hook surface instead of each page inventing its own data.
- Screenshot to save: `codex-log-01b-profile.png`

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
