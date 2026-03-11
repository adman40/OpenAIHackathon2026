# Hook

Hook is a college admin co-pilot for academics, scholarships, research, internships, clubs, and campus support chat. The MVP shows one profile flowing into ranked next steps across every major student-admin surface.

## Demo Summary

- Onboarding now captures account identity, UT EID, major, transcript, resume, optional profile photo, and GPA visibility.
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
- `NEXT_PUBLIC_SUPABASE_URL`: optional for productization mode; enables Supabase auth and persistent profile reads/writes
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: optional for productization mode; used by the browser auth/profile client
- `SUPABASE_SERVICE_ROLE_KEY`: optional bootstrap/admin key for future server-side profile and storage flows

If Supabase env vars are missing, Hook now falls back to a durable local demo account/profile store so onboarding, reloads, and dashboard navigation remain demo-safe.

## Demo Flow

1. Start on `/onboarding` and either create a Hook account or use `Try Demo Mode`.
2. Upload a transcript and resume to show the seeded parsing flow; if the file is not text-readable in-browser, Hook falls back to a controlled major-based import so the demo still lands cleanly.
3. Open `/dashboard` to show the integrated student view, first-name greeting, degree-completion stat, and five parallel engine summaries plus chat.
4. Drill into `/academic`, `/scholarships`, `/research`, `/internships`, `/saved`, and `/clubs` using the shared nav.
5. Use chat for campus support, study strategy, outreach drafting, or sports snapshot questions.

## Demo Safety

- The dashboard has a static fallback layer in [`lib/demo-fallbacks.ts`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/lib/demo-fallbacks.ts).
- If one or more engines fail live, the dashboard swaps that card to fallback data and shows a badge.
- If `NEXT_PUBLIC_DEMO_STATIC=true`, the dashboard runs entirely from demo-safe payloads.
- If Supabase env vars are unavailable, Hook falls back to durable local auth/profile storage so onboarding, refreshes, and navigation remain usable during the demo.
- Transcript and resume uploads use browser-safe deterministic parsing with seeded fallbacks when the uploaded file is not text-readable yet.
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
