# Hook AI Case Study Report

## Abstract

Hook is a profile-first student support product built for the OpenAI Build It Forward Hackathon. One student profile powers academic planning, scholarships, research, internships, clubs, saved opportunities, and campus support chat. The project also serves as a case study in parallel AI-assisted development with Codex: multiple workstreams moved at once, shared contracts stayed aligned, and the final product remained demo-safe under deadline pressure.

## Executive Summary

- Hook turns one student profile into ranked next steps across the main areas where students lose time and momentum.
- The team used Codex as an engineering collaborator inside a controlled workflow, not as a one-shot code generator.
- Deterministic local datasets were used for ranking surfaces to keep the demo explainable and reliable.
- GPT-4o was used narrowly in chat, where freeform drafting and routing are actually useful.
- Fallback behavior was treated as a feature, not something to hide.

## Product Overview

Hook is built around a simple claim: students should not need to restate their identity, coursework, interests, and goals across disconnected systems. In Hook, onboarding creates one durable profile, and that profile powers:

- academic progress and next-semester planning
- scholarship ranking
- research and internship matching
- club matching
- saved opportunities
- campus support and outreach chat

## Engineering Approach

The project used a three-track collaboration model:

- Person A: platform shell, onboarding, dashboard, chat, docs, final integration
- Person B: academic engine, degree data, clubs
- Person C: scholarships, research, internships, saved opportunities

Codex accelerated delivery most effectively when prompts included:

- exact repo context
- clear ownership boundaries
- a shared type contract
- concrete files in scope
- explicit fallback and verification requirements

## Why Codex Worked Here

Codex was most useful when the problem was framed as bounded engineering work rather than vague feature generation. In this project it helped:

- scaffold and restore app structure
- wire shared profile state
- implement API routes and ranking logic
- build dashboard integration
- patch demo-facing bugs quickly
- keep documentation synchronized with code changes

The central lesson is operational: AI became more useful as repository structure, review checkpoints, and ownership became clearer.

## Reliability and Demo Safety

Hook was optimized for a stable demo, not inflated production claims. Important reliability choices included:

- deterministic local datasets for ranking
- explicit fallback payloads for dashboard cards
- local persistence when Supabase is absent
- controlled chat fallback when GPT-4o is unavailable
- transcript and resume parsing tuned for the demo documents

This made the system more credible because failure modes were visible and controlled rather than hidden.

## Key Lessons

1. Shared contracts matter more than generation speed.
2. AI output is easiest to use on bounded tasks and hardest on cross-cutting migrations.
3. Parallel worktrees reduce merge risk when multiple AI-assisted sessions are active.
4. Diff review and incremental prompting outperform giant rewrite prompts.
5. Documentation should move alongside code, not after it.
6. Demo-safe fallbacks are often more valuable than unfinished “live” integrations.

## Recommendations for Future Teams

1. Use AI inside a repository operating model with ownership and review, not as an isolated code-writing step.
2. Define shared contracts early and protect them.
3. Separate deadline pressure from minimum acceptable scope.
4. Budget time for integration, verification, and presentation cleanup.
5. Treat screenshots, logs, and docs as technical evidence, not decoration.

## Repo References

- `README.md`
- `docs/demo-script.md`
- `docs/judge-qa.md`
- `docs/openai-story.md`

## Source Note

This Markdown version is a cleaned repo copy of the longer PDF case study report used for submission support.
