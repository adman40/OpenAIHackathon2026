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
