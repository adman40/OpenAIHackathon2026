# Hook

Hook is a profile-first student support app for UT Austin. One student profile powers academic planning, scholarships, research, internships, clubs, saved opportunities, and campus-support chat.

Live demo: [hook-demo.vercel.app/onboarding](https://hook-demo.vercel.app/onboarding)

## What It Does

- Builds a student profile from onboarding, transcript upload, resume upload, and preferences
- Shows ranked next steps across academics, scholarships, research, internships, and clubs
- Tracks saved opportunities in one place
- Uses GPT-4o for chat, with local fallbacks for demo stability

## Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Local JSON datasets for deterministic ranking surfaces
- OpenAI SDK for chat

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

- `OPENAI_API_KEY`: enables live chat responses
- `NEXT_PUBLIC_SUPABASE_URL`: optional Supabase client URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: optional Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: optional server-side Supabase key
- `NEXT_PUBLIC_DEMO_STATIC=true`: forces dashboard demo fallbacks

If Supabase is not configured, Hook falls back to local browser persistence for demo safety.

## Submission Docs

- `docs/demo-script.md`
- `docs/judge-qa.md`
- `docs/openai-story.md`
- `docs/hook-ai-case-study-report.md`
- `docs/reports/hook_ai_case_study_report.pdf`

## Core Demo Flow

1. Start on `/onboarding`
2. Upload transcript and resume
3. Open `/dashboard`
4. Show `/academic`, `/scholarships`, `/research`, `/internships`, and `/clubs`
5. Use chat for a campus support or outreach prompt

## Demo Safety

- Dashboard supports controlled fallback payloads in `lib/demo-fallbacks.ts`
- Chat has a local deterministic fallback path
- Transcript and resume parsing now work on both localhost and Vercel
- Academic analysis uses bundled UT datasets in production
