# Hook

Hook is a college admin co-pilot for reducing student stress outside the classroom.
This repository is the shared collaboration scaffold for the three-person MVP build in [`hook-mvp-build-plan.html`](./hook-mvp-build-plan.html).

## Current Status

This repo is initialized with:

- the agreed folder structure
- shared TypeScript interfaces in `lib/types.ts`
- starter docs for the pitch and OpenAI story
- a `CODEX-LOG.md` file for tracking major Codex tasks
- collaborator onboarding notes in `docs/collaboration-setup.md`

The repo now includes the core Next.js 14 + Tailwind app scaffold that Person A's platform work builds on.

## Team Ownership

- Person A: platform, onboarding, dashboard, chat, docs, integration
- Person B: academic engine, degree data, clubs
- Person C: scholarships, research, internships, opportunity data

Rule: do not edit another person's folders before merge windows.

## Repo Structure

```text
app/
  onboarding/
  dashboard/
  academic/
  scholarships/
  research/
  internships/
  clubs/
components/
  profile/
  shared/
  chat/
  clubs/
  academic/
  scholarships/
  opportunities/
pages/api/
  chat/
  clubs/
  academic/
  scholarships/
  research/
  internships/
data/
  degrees/
  courses/
  scholarships/
  opportunities/
  clubs/
  resources/
lib/
  academic/
  matchers/
  profile-context.tsx
  types.ts
docs/
README.md
CODEX-LOG.md
```

## Recommended Branch / Worktree Setup

```bash
git branch feat/academic-clubs
git branch feat/opportunities
git worktree add ../hook-academic-clubs feat/academic-clubs
git worktree add ../hook-opportunities feat/opportunities
```

## First Build Order

1. Person A completes the foundation and profile tasks on `main`.
2. Person B pulls `main` and starts academic + clubs work in `feat/academic-clubs`.
3. Person C pulls `main` and starts scholarships + opportunities work in `feat/opportunities`.
4. Person A owns merges back into `main`.

## Important Files

- Build guide: [`hook-mvp-build-plan.html`](./hook-mvp-build-plan.html)
- Earlier reference guide: [`hook-build-plan.html`](./hook-build-plan.html)
- Collaboration setup: [`docs/collaboration-setup.md`](./docs/collaboration-setup.md)
- Shared types: [`lib/types.ts`](./lib/types.ts)
- OpenAI story: [`docs/openai-story.md`](./docs/openai-story.md)
- Demo script: [`docs/demo-script.md`](./docs/demo-script.md)
- Judge Q&A: [`docs/judge-qa.md`](./docs/judge-qa.md)
- Codex log: [`CODEX-LOG.md`](./CODEX-LOG.md)

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The root route redirects to onboarding, and the `ProfileProvider` is mounted in the app layout for the shared profile flow.
