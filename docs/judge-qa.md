# Judge Q&A

## Product Questions

### How is Hook different from students using existing websites?

Hook is the prioritization layer across fragmented student systems. It turns one profile into next steps instead of forcing the student to search each surface manually.

### Is the data live?

For the MVP, the data is curated locally so the team can prove the product flow quickly and reliably. The production version would connect to real sources.

### Why include clubs?

Student success is not only academics and jobs. Community fit also affects stress, belonging, and long-term outcomes.

## OpenAI Questions

### How did you use Codex?

Codex is the build engine for the repo: scaffolding, structured data generation, UI implementation, API implementation, and documentation.

### Why use multiple worktrees?

Separate worktrees let three teammates build in parallel with low merge conflict risk and a clear ownership model.

### Why should students trust the fit score?

The score is transparent and explainable: each card includes explicit match reasons (major, coursework, skills, interests, location/term fit), so users can see why an item ranked high instead of relying on a black-box score.

### How reliable is curated opportunity data?

For MVP reliability, opportunities are intentionally curated and versioned in local JSON so demos are deterministic and quality-controlled. The architecture already isolates data ingestion from matching, so live connectors can replace curated feeds without rewriting ranking logic.

### Why is ranking better than manual search portals?

Manual search requires students to repeatedly filter and compare listings with no profile context. Hook starts from one profile, pre-ranks opportunities by likely fit, and surfaces deadline-relevant details quickly, which reduces missed opportunities and decision friction.
