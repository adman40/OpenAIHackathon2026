# Collaboration Setup

## What Is Already Initialized

This repository already includes the shared scaffold for the Hook MVP:

- agreed folder structure for app, components, APIs, data, docs, and shared libraries
- shared TypeScript interfaces in `lib/types.ts`
- starter product and pitch docs
- a `CODEX-LOG.md` file for documenting major Codex tasks
- a local git repository initialized on `main`

## Team Ownership

- Person A: platform, onboarding, dashboard, chat, docs, integration
- Person B: academic engine, degree data, clubs
- Person C: scholarships, research, internships, opportunity data

## Recommended Local Setup

1. Clone the repo locally.
2. Read `hook-mvp-build-plan.html`.
3. Pull the latest `main`.
4. Create the two feature branches:
   - `feat/academic-clubs`
   - `feat/opportunities`
5. Create two worktrees:

```bash
git branch feat/academic-clubs
git branch feat/opportunities
git worktree add ../hook-academic-clubs feat/academic-clubs
git worktree add ../hook-opportunities feat/opportunities
```

## Shared Rules

- Person A owns merges into `main`.
- Do not edit another person's folders before merge windows.
- If a shared type needs to change, update `lib/types.ts` first and notify the team.
- Log major Codex tasks in `CODEX-LOG.md`.
- Save screenshots during the build for the OpenAI story.

## First Tasks

- Person A: foundation review, onboarding, dashboard shell
- Person B: academic data and academic engine
- Person C: scholarship data and opportunity matcher

## Important Files

- `hook-mvp-build-plan.html`: master build guide
- `lib/types.ts`: shared contract for all feature work
- `docs/openai-story.md`: OpenAI/Codex usage story
- `docs/demo-script.md`: 90-second demo outline
- `docs/judge-qa.md`: judge prep
- `CODEX-LOG.md`: build log

