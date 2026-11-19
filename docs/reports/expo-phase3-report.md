# CDD Expo Phase 3 Report — Graph and analysis presentation

## Objective

Present the existing campus dependency network and persisted analysis paths
clearly, without changing analysis semantics, the scoring engine, or API
contracts.

## Work completed

- The graph renders directed current dependency relationships from the
  connected workspace and overlays all retained paths in the selected
  immutable analysis run, including snapshot-only relationships.
- Event/trigger, directly affected, and downstream entities are visually
  distinct; affected nodes use the existing impact severity bands.
- Removed crowded canvas edge labels and compacted the relationship detail
  list. Accessible relationship and retained-path details remain available.
- Added graph loading, error, and empty states, plus coverage for multiple
  paths, inactive dependencies, and snapshot-only edges.
- Analysis and scenario comparison scores display one decimal place without
  changing backend values or calculations. The default result selection now
  focuses an affected entity rather than the trigger.
- Updated the walkthrough styling and documentation to explain that links to
  alternatives do not establish availability.
- No backend, API, database, dependency, or scoring changes.

## Verification

| Check | Result |
|---|---|
| Full frontend tests | PASS — 17 tests across 4 files |
| ESLint | PASS |
| Prettier check | PASS |
| TypeScript typecheck | PASS |
| Production build | PASS |
| `git diff --check` | PASS; Git reported LF/CRLF normalization warnings only |
| Real campus records | Existing persisted paths were inspected; no new run or database record was created |

The real-backend browser walkthrough was verified in Phase 2. A fresh visual
check of the final graph layout after the last styling refinements was not
completed; the graph structure and states are covered by the focused tests.

## Data and interpretation boundaries

- Current dependency records and historical analysis paths are presented
  separately so the graph does not imply that current records reproduce an
  older analysis snapshot.
- Dependency direction and weight are not presented as probability.
- Impact values are heuristic estimates; confidence describes dependency
  review quality, not probability.
- Alternative-lab and slot relationships are not evidence of availability.
- The analysis score and NetworkX engine remain unchanged.

## Phase 4 status

Phase 4 was not implemented. `ollama --version` and `ollama list` could not
confirm an installed local CLI/model. The local tags endpoint responded with
an empty model list, and `qwen2.5:3b` was unavailable. No AI output was
fabricated or substituted.

To resume the conditional feature later, install/start Ollama and run:

```powershell
ollama --version
ollama list
ollama pull qwen2.5:3b
Invoke-RestMethod -Uri 'http://localhost:11434/api/tags'
```

Only proceed once the model is confirmed locally. The AI explanation must
remain optional, server-side, suggestion-only, and subject to human review.
