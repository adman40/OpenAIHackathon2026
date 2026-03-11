# OpenAI Story

## Goal

Explain how OpenAI tools were central to building Hook, not just embedded as a feature.

## Team Ownership

- Person A: platform, onboarding, dashboard, chat, docs, integration
- Person B: academic engine, degree data, clubs
- Person C: scholarships, research, internships, opportunity data

## Three-Worktree Setup

- `main`: Person A
- `feat/academic-clubs`: Person B
- `feat/opportunities`: Person C

## Screenshot Checklist

- `codex-log-01-types.png`
- `codex-log-02-academic-engine.png`
- `codex-log-02-academic-data.png`
- `codex-log-02b-academic-ui.png`
- `codex-log-03-scholarships.png`
- `codex-log-04-clubs.png`
- `codex-log-05-opportunities.png`
- `codex-log-06-chat.png`
- `codex-log-07-three-worktrees.png`

## Major Files Codex Should Generate

- shared types and onboarding flow
- academic engine and academic UI
- scholarship and opportunity matchers
- clubs matcher and UI
- chat route and chat UI
- demo and pitch documentation

## Notes To Fill In During Build

- Which files Codex created directly
- Which files humans edited after review
- Where Codex saved time in parallel worktrees
- Structured academic data generation made it easy to demo degree progress, prereq alerts, and course recommendations with consistent JSON inputs.

## Academic UI Note

The academic UI translated the engine output into a scan-friendly story for judges: one page shows progress at a glance, surfaces the biggest prereq blocker, separates core and major next steps, and keeps the eligible course list easy to narrate during the live demo.

## Clubs Note

The clubs feature stayed intentionally lightweight so it could answer one useful question fast: "Which organizations fit this student right now?" A single ranked list with short reasons, meeting cadence, and join links keeps community fit visible without turning the demo into a second full planner.

## Academic And Clubs Technical Summary

The academic engine reads local degree requirements and course catalogs, computes percent complete, ranks eligible courses, and surfaces prereq alerts when one missing course can delay a larger sequence. Those alerts are deterministic and explainable because they come directly from the prerequisite graph in the curated course metadata. The club matcher uses the same profile-first approach: it scores organizations with a simple deterministic formula based on interests, major fit, career goal, and weekly time availability, then returns short reasons that make each recommendation easy to justify in front of judges.

