# Hook

Hook is a college admin co-pilot for academics, scholarships, research, internships, clubs, and campus support chat. The MVP shows one profile flowing into ranked next steps across every major student-admin surface.

## Demo Summary

- Onboarding captures one shared student profile.
- Dashboard calls all five matching engines in parallel and summarizes the best next move in each area.
- Academic planning surfaces degree progress, prerequisite blockers, and recommended courses.
- Scholarships, research, internships, and clubs are ranked from the same profile.
- Chat uses GPT-4o plus local campus resources and a local fallback path for demo safety.

## Team Split

- Person A: platform shell, onboarding, dashboard, chat, docs, integration
- Person B: academic engine, degree data, clubs
- Person C: scholarships, research, internships, opportunity data

## Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Local JSON and markdown datasets for deterministic demo data
- OpenAI Node SDK for chat

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

- `OPENAI_API_KEY`: optional; enables live GPT-4o responses in chat
- `NEXT_PUBLIC_DEMO_STATIC=true`: optional; forces the dashboard to use static fallback payloads instead of live API calls

## Demo Flow

1. Start on `/onboarding` and enter or load the demo profile.
2. Open `/dashboard` to show five parallel engine summaries plus chat.
3. Drill into `/academic`, `/scholarships`, `/research`, `/internships`, and `/clubs`.
4. Use chat for campus support, study strategy, outreach drafting, or sports snapshot questions.

## Demo Safety

- The dashboard has a static fallback layer in [`lib/demo-fallbacks.ts`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/lib/demo-fallbacks.ts).
- If one or more engines fail live, the dashboard swaps that card to fallback data and shows a badge.
- If `NEXT_PUBLIC_DEMO_STATIC=true`, the dashboard runs entirely from demo-safe payloads.
- Chat also falls back to local deterministic guidance if GPT-4o is unavailable.

## Important Files

- Build plan: [`hook-mvp-build-plan.html`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/hook-mvp-build-plan.html)
- Dashboard integration: [`app/dashboard/page.tsx`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/app/dashboard/page.tsx)
- Static fallback payloads: [`lib/demo-fallbacks.ts`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/lib/demo-fallbacks.ts)
- Shared profile state: [`lib/profile-context.tsx`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/lib/profile-context.tsx)
- OpenAI build story: [`docs/openai-story.md`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/docs/openai-story.md)
- Demo script: [`docs/demo-script.md`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/docs/demo-script.md)
- Judge prep: [`docs/judge-qa.md`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/docs/judge-qa.md)
- Codex log: [`CODEX-LOG.md`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/CODEX-LOG.md)

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
