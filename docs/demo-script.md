# Demo Script

## 90-Second Version

### 0:00-0:12

"College stress is not just classes. Students are juggling degree planning, scholarships, research, internships, clubs, and figuring out where to go for help. Hook is one profile that turns all of that into next steps."

### 0:12-0:28

Open `/dashboard`.

"This dashboard calls all five Hook engines in parallel. From one student profile, it summarizes academic risk, funding, research, internships, and community fit in one place. The chat panel is using that same profile, so the student does not need to restate context."

If the fallback badge is visible:

"For demo safety, Hook can fall back to static payloads shaped exactly like the live APIs. That lets the product stay functional even if one engine fails during the demo."

### 0:28-0:42

Open `/academic`.

"Here Hook is not just listing classes. It is reading degree requirements and prerequisite chains, showing percent complete, flagging the blocker course, and ranking the next classes to take."

### 0:42-0:54

Open `/scholarships`.

"Here the same profile becomes ranked scholarships with fit score, amount, urgency, and concrete match reasons so the student can apply faster and miss fewer deadlines."

### 0:54-1:08

Open `/research` and `/internships`.

"Hook uses one shared opportunity-matching system for research and internships, then lets the student filter by term, location, pay, and saved status. This is ranking, not just search."

Optional if there is time:

"The saved page turns research and internships into one shortlist for follow-up."

### 1:08-1:18

Open `/clubs`.

"Hook also recommends communities, because belonging and support affect student success just as much as classes and jobs."

### 1:18-1:30

Return to `/dashboard` and use chat.

"The chat assistant uses GPT-4o plus local campus resources. It can draft outreach, route students to support, answer campus questions, and still fall back safely if the model is unavailable."

## Fallback Plan

- Preferred path: run live local APIs and live chat with `OPENAI_API_KEY` set.
- Dashboard backup path: set `NEXT_PUBLIC_DEMO_STATIC=true` before the demo to force all five dashboard cards to use [`lib/demo-fallbacks.ts`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/lib/demo-fallbacks.ts).
- Partial failure path: if one or more dashboard engines fail, Hook shows a fallback badge and keeps the affected cards populated.
- Chat backup path: if GPT-4o fails or no API key is set, the chat route returns local deterministic guidance grounded in campus resources.

## Demo Operator Notes

- Start from the onboarding flow unless time is already short.
- Keep the dashboard visible long enough for judges to notice that all five engines are represented at once.
- If a card is in fallback mode, mention it briefly and move on. The point is resilience, not pretending every dependency is live.
- Do not spend time explaining local JSON datasets unless a judge asks.
