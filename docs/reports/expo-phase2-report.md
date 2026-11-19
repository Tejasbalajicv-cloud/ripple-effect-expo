# CDD Expo Phase 2 Report — Guided campus walkthrough

## 1. Objective

Guide an expo audience through the existing North Campus disruption using the
real seeded event, trigger, dependencies, persisted analysis, and isolated
scenario workflow without creating demo-only records or claiming certainty.

## 2. Work completed

- North Campus now selects the exact existing event
  `Advanced Computing Laboratory unavailable` on connection, even when other
  events appear earlier in the API response. Other workspaces retain their
  existing first-event selection behavior.
- North Campus initial run selection prefers an existing completed baseline
  run over a scenario run.
- Added a compact four-step walkthrough:
  1. Review the event and its actual direct trigger, `Advanced Computing
     Laboratory (AC-LAB)`.
  2. Inspect real outgoing dependencies and their direction/strength.
  3. Review a persisted backend analysis or run the real analysis API if no
     completed baseline exists.
  4. Explore isolated what-if scenarios with a clear human-review reminder.
- Walkthrough descriptions are populated from the connected workspace, event,
  trigger, dependencies, and analysis results. It does not create, seed, or
  hardcode event/entity/run records.
- Explicitly explains that dependency weights are strength rather than
  probability; impact bands are heuristic; confidence is dependency review
  quality; and alternative-lab/slot links do not establish real availability.
- Added responsive styling and a focused test covering campus-event selection,
  its real direct trigger/dependency, and the analysis API call.
- No backend, API contract, database, scoring, or package/dependency changes.

## 3. Decisions

- Use the exact seeded event title as the campus demo entry point, then use
  organization-scoped API responses for its trigger and downstream result
  names.
- Keep manual event selection and manual workspace connection available.
- Prefer a completed baseline run for the guided story; preserve the existing
  behavior for other workspaces.
- No AI-generated recommendations are shown. Human-authored scenario
  interventions remain explicitly hypothetical and isolated.

## 4. Verification performed

| Command/check | Result | Evidence |
|---|---|---|
| `npm test -- --run --pool=forks --maxWorkers=1` in `frontend` | PASS | 14 tests passed across 3 files |
| `npm run lint` in `frontend` | PASS | ESLint completed without findings |
| `npm run format:check` in `frontend` | PASS | All files matched Prettier |
| `npm run typecheck` in `frontend` | PASS | TypeScript project check passed |
| `npm run build` in `frontend` | PASS | TypeScript compilation and Vite production build succeeded |
| `git diff --check` | PASS | No whitespace errors; Git emitted only existing LF/CRLF normalization warnings |
| Browser against existing local Vite/API/SQLite stack | PASS | North Campus preset connected; the campus event was pressed/selected, AC-LAB rendered, and saved results listed sessions, batches, timetable, and slots |
| Read-only campus API inspection | PASS | Two completed existing baseline runs, each with eight results; no new run was created by verification |

## 5. Test results

- Focused campus walkthrough test passes.
- Full frontend suite: **14 passed**.
- Lint, formatting, typecheck, production build, and diff checks pass.
- The actual backend/browser check reused existing records; no POST, seed,
  migration, reset, or database mutation was used.

## 6. Security and data integrity

- Preserved backend membership enforcement and local-auth-only setup.
- Used only the local API and existing synthetic campus data.
- Existing history and records were read; no records were deleted or reset.
- No external AI/provider call was made.

## 7. Evidence integrity

- Real dependencies show AC-LAB directed to Practical Session A and Practical
  Session B.
- Existing persisted analysis results show Student Batch 1, Student Batch 2,
  Shared Timetable, Afternoon Slot 1, and Afternoon Slot 2.
- Alternative Laboratory B/C have modeled capacity relationships to slots;
  neither the graph nor this walkthrough claims those resources are available.
- The real database also contains unrelated existing events. The app focuses
  the exact campus event rather than relying on event ordering.

## 8. Deviations and blockers

- The initial browser state previously selected `Tornado`; the campus-specific
  selection fixes that observed issue.
- The local Ollama CLI is absent. Its local tags API responds, but has no
  installed models; `qwen2.5:3b` is not installed. Phase 4 must not be
  implemented as a mock or hardcoded substitute.

## 9. Progress file

`docs/progress.md` records the completed guided-walkthrough phase, its live
backend evidence, and test/build results.

## 10. Human review required

- Review whether the guided copy and ordering are suitable for the live expo
  presentation.
- Before a live presentation, confirm campus staff interpret scenario
  interventions and alternative capacity links as hypotheses rather than
  verified availability.

## 11. Phase exit assessment

- Exit criteria met: **YES**.
- Evidence-backed explanation: the browser connected to the existing backend,
  selected the seeded campus event despite earlier unrelated events, showed
  its actual AC-LAB trigger, and listed downstream results from persisted
  analysis history. Tests and all requested frontend checks passed.
- Recommended next phase: CDD Expo Phase 3 — full dependency network and
  analysis presentation.

## Phase 4 resume commands

After installing Ollama and its requested model locally, verify availability
with:

```powershell
ollama --version
ollama list
ollama pull qwen2.5:3b
Invoke-RestMethod -Uri 'http://localhost:11434/api/tags'
```

Only implement the conditional AI explanation after `qwen2.5:3b` is confirmed
installed and local. No AI feature was added in this phase.
