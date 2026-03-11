# OpenAI Story

## What Hook Shows

Hook is a profile-first student support product. A student enters one profile once, and Hook turns it into academic guidance, scholarship matches, research and internship opportunities, club recommendations, and support chat.

The product demo is intentionally practical: deterministic local datasets for ranking surfaces, plus GPT-4o only where a generative assistant actually adds value.

## Exact Ownership Split

- Person A: platform shell, onboarding, dashboard, chat, docs, final integration
- Person B: academic engine, degree data, course metadata, clubs
- Person C: scholarships, research, internships, opportunity data, saved opportunities

## Three-Worktree Setup

- `main`: Person A working branch for platform, docs, and merges
- `feat/academic-clubs`: Person B worktree for academic and clubs
- `feat/opportunities`: Person C worktree for scholarships, research, internships, and saved opportunities

This mattered because each person could build against the shared type contract without waiting on the others, and Person A could merge the finished surfaces back into one demo-ready product.

## Where Codex Helped Most

- Bootstrapped the shared repo structure and type contract.
- Built the profile state layer and onboarding flow.
- Restored the missing Next.js 14 and Tailwind scaffold after the app shell went missing.
- Generated deterministic API routes and matching logic around local datasets.
- Implemented the dashboard integration layer and static fallback system.
- Built the chat route and UI around GPT-4o plus local campus grounding.
- Rewrote the demo, judge, and OpenAI story documentation once implementation stabilized.

## What Codex Generated

- Shared contracts in `lib/types.ts`
- Session-backed profile state in `lib/profile-context.tsx`
- Onboarding UI in `components/profile/ProfileForm.tsx` and `app/onboarding/page.tsx`
- Platform UI pieces such as `components/shared/NavBar.tsx` and `components/shared/SummaryCard.tsx`
- Dashboard integration in [`app/dashboard/page.tsx`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/app/dashboard/page.tsx)
- Static demo payloads in [`lib/demo-fallbacks.ts`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/lib/demo-fallbacks.ts)
- Academic, scholarship, club, research, and internship API support
- Chat route in `pages/api/chat/respond.ts` and chat UI in `components/chat/*`
- Final docs in `README.md`, `docs/demo-script.md`, `docs/judge-qa.md`, and `CODEX-LOG.md`

## What Humans Reviewed

- The ownership split and scope cuts in the build plan
- Dataset realism and whether curated examples were demo-worthy
- Merge order across the three worktrees
- UI and copy edits for the final demo flow
- Whether fallback behavior stayed believable instead of hiding failures
- Final pitch wording and which screenshots to save

The practical split was: Codex generated most of the implementation draft, then humans checked product realism, merge safety, and the narrative quality of the demo.

## Why GPT-4o Was Used Narrowly

- Chat is the only surface that benefits from freeform generation.
- The answer is grounded with `StudentProfile`, [`data/resources/campus-resources.md`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/data/resources/campus-resources.md), and [`data/resources/sports-snapshot.json`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/data/resources/sports-snapshot.json).
- If the model call fails, Hook returns local deterministic guidance instead of a broken chat experience.

That design kept the product believable: deterministic ranking engines where explainability matters, generative help where drafting and routing matter.

## Demo Reliability Story

- All ranking surfaces run on local curated datasets.
- The dashboard calls five APIs in parallel so the product feels unified.
- [`lib/demo-fallbacks.ts`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/lib/demo-fallbacks.ts) mirrors the live response shapes exactly.
- `NEXT_PUBLIC_DEMO_STATIC=true` forces static mode for a judge-safe demo if network or route behavior gets unstable.
- The dashboard shows a badge when fallback data is active so the behavior stays honest.

## Screenshot Checklist

- `codex-log-01-types.png`
- `codex-log-01b-profile.png`
- `codex-log-01c-dashboard-shell.png`
- `codex-log-01d-dashboard-integration.png`
- `codex-log-02-academic-data.png`
- `codex-log-02-academic-engine.png`
- `codex-log-02b-academic-ui.png`
- `codex-log-03-scholarships.png`
- `codex-log-03b-scholarships-ui.png`
- `codex-log-04-clubs.png`
- `codex-log-04b-academic-clubs-docs.png`
- `codex-log-05-opportunities.png`
- `codex-log-05b-opportunities-ui.png`
- `codex-log-05c-opportunities-docs.png`
- `codex-log-06-chat.png`
- `codex-log-07-three-worktrees.png`

Total screenshots planned: 16
