# Judge Q&A

## Product

### What problem does Hook solve?

Students usually manage academics, money, opportunities, communities, and campus support in separate systems. Hook reduces that fragmentation by turning one profile into prioritized next steps across all of them.

### What is actually live in the MVP?

The product flow is live. The ranking engines, dashboard integration, onboarding, saved opportunities, and chat UI are all functional. The datasets are curated local files so the demo stays deterministic and reliable.

### Why not just use existing university portals?

Existing portals are usually system-of-record tools, not prioritization tools. Hook sits above them and answers, "What matters most for this specific student right now?"

### Why include clubs in the same product?

The point is reducing admin stress, not only optimizing classes and jobs. Clubs help with belonging, momentum, and network effects, so they belong in the same student-support layer.

### How should we think about the fit scores?

They are deterministic ranking signals, not opaque predictions. Each surface exposes short match reasons so the student can understand why an item ranked highly.

## Technical

### Does the same student profile really carry across the product now?

Yes. The dashboard, academic, clubs, scholarships, research, internships, saved page, and chat all read from the same shared profile contract now. That was a key productization fix because some MVP pages still used a hardcoded demo student before this pass.

### How are the dashboard cards powered?

[`app/dashboard/page.tsx`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/app/dashboard/page.tsx) calls `/api/academic/analyze`, `/api/scholarships/match`, `/api/research/match`, `/api/internships/match`, and `/api/clubs/match` in parallel, then turns the responses into five top-line summaries.

### What happens if one API fails?

The dashboard falls back to static payloads from [`lib/demo-fallbacks.ts`](/Users/amanoni/Desktop/OpenAIHackathon/OpenAIHackathon2026/lib/demo-fallbacks.ts) for the failed surface and shows a small badge so the fallback is visible.

### What happens if everything is unstable before the demo?

Set `NEXT_PUBLIC_DEMO_STATIC=true` and the dashboard will run entirely from static demo payloads shaped exactly like the live responses.

### Why use local datasets?

For a hackathon MVP, local curated data is the right scope decision. It keeps the ranking logic explainable, the demo reliable, and the architecture ready for future connectors without spending the event on scraping or auth.

### How hard would it be to go live later?

The ranking logic is already separated from ingestion. Replacing local JSON with SIS, scholarship, or opportunity feeds is mostly a data integration task, not a full product rewrite.

## OpenAI

### Where does OpenAI actually matter here?

OpenAI matters in two places: Codex accelerated the build process itself, and GPT-4o powers the chat assistant where freeform drafting and routing are useful.

### What did Codex generate versus what humans did?

Codex generated major implementation drafts across scaffold, profile flow, APIs, dashboard integration, chat, and docs. Humans reviewed ownership boundaries, dataset quality, merges, product wording, and final demo realism.

### Why use worktrees instead of one branch?

Three worktrees let the team build academic/clubs, opportunities, and platform/docs in parallel with much lower conflict risk. That was important because the product only works if all five surfaces merge cleanly into one profile-driven app.

### Why use GPT-4o only for chat?

Academic and opportunity ranking need deterministic outputs and clear explanations. Chat is where language generation actually helps: drafting outreach, routing to resources, and turning messy questions into next actions.

### What if the OpenAI call fails during the demo?

The chat route is built with a local fallback path. If GPT-4o is unavailable or `OPENAI_API_KEY` is missing, Hook still returns grounded deterministic guidance instead of breaking.

## Productization

### What makes this more than a hackathon shell now?

The biggest change is that the product now behaves around a durable student account instead of a temporary browser-only demo profile. Onboarding is more realistic, profile consistency carries across pages, and the demo has explicit fallback paths instead of hidden failure points.

### Is this fully production-grade today?

No. It is a productization branch optimized for a convincing live demo. The core user flow feels much more real, while some deeper backend pieces such as full parsing pipelines and full Supabase deployment are intentionally thin or staged behind fallback behavior.

### Why keep fallback behavior instead of removing it?

Because fallback behavior makes the demo honest and resilient. We would rather show a controlled backup path than risk a broken screen or pretend an unfinished integration is fully live.

### What exactly did Codex help with in this final push?

Codex accelerated repo inspection, contract migration, onboarding refactor, targeted cleanup of demo-profile leaks, and the synchronized documentation pass. The human team still decided scope, reviewed results, and shaped the product story.

### How did you use Codex under deadline without losing control?

We used incremental prompts tied to specific workstreams, reviewed the diff after each major step, and required docs to update alongside code. That kept the collaboration visible and reduced the risk of fast but sloppy changes.

## Credibility

### Are you pretending the fallback data is live?

No. The dashboard shows a badge when fallback mode is active. The goal is a resilient MVP, not a fake production integration.

### Why is this believable beyond the hackathon?

Because the hard product question is not "Can we scrape another portal?" It is "Can one profile coordinate the main areas where students lose time and momentum?" This MVP already proves that product shape.
