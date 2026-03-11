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

## Productization Branch Notes

- Codex accelerated the productization branch by replacing the MVP's session-only profile state with a Supabase-ready auth/profile contract instead of rebuilding the app shell from scratch.
- The collaboration pattern stayed pragmatic: Codex first mapped every `StudentProfile` dependency, then introduced a compatibility layer so Engineer A could move auth/onboarding forward without blocking the existing scholarship, opportunity, clubs, and chat surfaces.
- The change mattered because the product story is now closer to a real student account system: UT email, UT EID, verification state, and persistent profile storage are part of the platform contract rather than presentation-only copy.
- A controlled local fallback remains in place so the demo still works even if Supabase credentials are not configured in time for recording.

## Engineer A Delivery Notes

- Product changes: the onboarding flow now uses real account inputs, transcript upload, resume upload, optional photo, numeric GPA, and persistent profile identity instead of the MVP-only GPA-range / preferred-term / preferred-location form.
- Product changes: the dashboard and nav now route through a shared home shell, greet the student by first name, surface degree completion instead of career-goal copy, and remove the remaining hardcoded Alex Rivera leaks from the academic and clubs pages.
- Codex acceleration: rather than editing one surface at a time, Codex traced every profile-contract dependency first, then landed the shared type/auth layer, then rewrote onboarding, then applied compatibility fixes to the matchers and chat route so the branch still built end to end.
- Collaboration flow: the human set the outcome and time-box, Codex handled repo evaluation, contract migration, implementation, smoke build, and docs updates in sequence, and the branch kept a demo fallback at each risky boundary instead of waiting for perfect backend completeness.

## How We Used Codex Under Deadline

- Fast repo evaluation: Codex started by comparing the live repo against the productization plan and identifying the exact MVP-shell gaps that would be visible in a demo.
- Incremental prompts: instead of one giant rewrite, the work was sequenced into auth/profile foundation, onboarding, dashboard polish, demo-leak cleanup, and final integration.
- Docs alongside code: each major product step also updated the repo narrative in `README.md`, `CODEX-LOG.md`, `docs/demo-script.md`, and `docs/judge-qa.md` so the implementation and the presentation story stayed aligned.
- Fallback-conscious delivery: Codex preserved explicit demo-safe fallback paths at risky boundaries like auth, uploads, dashboard data, and chat rather than over-claiming unfinished production infrastructure.

That workflow mattered because it turned Codex into a fast engineering partner with visible checkpoints, not a black-box code dump.

## What Codex Generated

- Shared contracts in `lib/types.ts`
- Session-backed profile state in `lib/profile-context.tsx`
- Onboarding UI in `components/profile/ProfileForm.tsx` and `app/onboarding/page.tsx`
- Platform UI pieces such as `components/shared/NavBar.tsx` and `components/shared/SummaryCard.tsx`
- Dashboard integration in `app/dashboard/page.tsx`
- Static demo payloads in `lib/demo-fallbacks.ts`
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
- The answer is grounded with `StudentProfile`, `data/resources/campus-resources.md`, and `data/resources/sports-snapshot.json`.
- If the model call fails, Hook returns local deterministic guidance instead of a broken chat experience.

That design kept the product believable: deterministic ranking engines where explainability matters, generative help where drafting and routing matter.

## Demo Reliability Story

- All ranking surfaces run on local curated datasets.
- The dashboard calls five APIs in parallel so the product feels unified.
- `lib/demo-fallbacks.ts` mirrors the live response shapes exactly.
- `NEXT_PUBLIC_DEMO_STATIC=true` forces static mode for a judge-safe demo if network or route behavior gets unstable.
- The dashboard shows a badge when fallback data is active so the behavior stays honest.

## Demo Format

- The current presentation assumption is a full 3-minute live demo.
- That longer window helps because the team can now show onboarding, dashboard, academic/clubs profile consistency, one opportunity surface, and chat in one coherent flow instead of rushing directly to the dashboard.
- The productization story lands better in 3 minutes because the audience can see both the user-facing polish and the infrastructure realism underneath it.

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
