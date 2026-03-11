# Demo Script

## Recommended 3-Minute Path

1. Start on `/onboarding`.
2. Show account fields: UT email, password, UT EID, major, transcript, resume, optional photo, GPA visibility.
3. Mention the safe fallback: if an uploaded file is not text-readable in-browser yet, Hook still converts it into a reviewable seeded profile so the product keeps moving.
4. Land on `/dashboard` and pause on the hero.
5. Say that the greeting uses the saved student identity, the dashboard is the home route, and all five engines load in parallel from one shared profile.
6. Open `/academic` and point out that the same student profile carries through without the old fake-student leak.
7. Open `/clubs` and make the same consistency point again.
8. Return to `/dashboard` and ask chat for either tutoring help or an outreach draft.

## 3-Minute Version

### 0:00-0:20

"College stress is not just classes. Students are juggling degree planning, scholarships, research, internships, clubs, and figuring out where to go for help. Hook is one profile that turns all of that into next steps."

### 0:20-0:50

Open `/onboarding`.

"The productized branch now starts with a real account flow. Instead of demo-only questions, the student gives Hook an identity, a UT EID, a major, a transcript, a resume, an optional profile photo, and a GPA privacy preference. Even when parsing is still thin, the app keeps a reviewable fallback path instead of breaking."

### 0:50-1:20

Open `/dashboard`.

"This dashboard calls all five Hook engines in parallel. From one saved student profile, it summarizes academic risk, funding, research, internships, and community fit in one place. The greeting is personalized, the dashboard is the clear home route, and the chat panel uses that same profile so the student does not need to restate context."

If the fallback badge is visible:

"For demo safety, Hook can fall back to static payloads shaped exactly like the live APIs. That lets the product stay functional even if one engine fails during the demo."

### 1:20-1:50

Open `/academic`.

"Here Hook is not just listing classes. It is reading degree requirements and prerequisite chains, showing percent complete, flagging the blocker course, and ranking the next classes to take. Most importantly for this branch, the page is now using the real shared student profile instead of a hardcoded fake student."

### 1:50-2:10

Open `/clubs`.

"The same profile consistency now carries into clubs too. That removed one of the biggest demo-breaking risks in the MVP shell, where some pages still ignored the student and showed Alex Rivera."

### 2:10-2:30

Open `/scholarships`.

"Here the same profile becomes ranked scholarships with fit score, amount, urgency, and concrete match reasons so the student can apply faster and miss fewer deadlines."

### 2:30-2:45

Open `/research` and `/internships`.

"Hook uses one shared opportunity-matching system for research and internships, then lets the student filter by term, location, pay, and saved status. This is ranking, not just search."

Optional if there is extra time:

"The saved page turns research and internships into one shortlist for follow-up."

### 2:45-3:00

Return to `/dashboard` and use chat.

"The chat assistant uses GPT-4o plus local campus resources. It can draft outreach, route students to support, answer campus questions, and still fall back safely if the model is unavailable."

## Onboarding Narration Notes

- "This is no longer a fake demo questionnaire. It now looks like the first-run workflow of a real student product."
- "We replaced preference-only inputs with inputs that could actually power the downstream experience."
- "Where the backend is intentionally thin tonight, we used reviewable fallback behavior instead of pretending the automation is complete."

## Dashboard Opening Line

"Before, the dashboard felt like a polished shell. After this pass, it feels like the home screen of a real student account: consistent identity, clear navigation, and cleaner summary language."

## Smoke-Test Summary

- Sign up / sign in: available through the onboarding form, with durable fallback persistence when Supabase env vars are absent.
- Onboarding: account details, major, transcript, resume, photo, GPA visibility, and editable skills all render and save.
- Dashboard: build verified; greeting, home navigation, fallback badge, and parallel engine loading remain intact.
- Academic: reads the shared profile context and no longer leaks a hardcoded student.
- Clubs: reads the shared profile context and no longer leaks a hardcoded student.

## Fallback Plan

- Preferred path: run live local APIs and live chat with `OPENAI_API_KEY` set.
- Dashboard backup path: set `NEXT_PUBLIC_DEMO_STATIC=true` before the demo to force all five dashboard cards to use [`lib/demo-fallbacks.ts`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/lib/demo-fallbacks.ts).
- Partial failure path: if one or more dashboard engines fail, Hook shows a fallback badge and keeps the affected cards populated.
- Chat backup path: if GPT-4o fails or no API key is set, the chat route returns local deterministic guidance grounded in campus resources.

## Demo Operator Notes

- Start from the onboarding flow. With a full 3-minute window, it is now part of the recommended path rather than something to skip.
- Keep the dashboard visible long enough for judges to notice that all five engines are represented at once.
- If a card is in fallback mode, mention it briefly and move on. The point is resilience, not pretending every dependency is live.
- Do not spend time explaining local JSON datasets unless a judge asks.
