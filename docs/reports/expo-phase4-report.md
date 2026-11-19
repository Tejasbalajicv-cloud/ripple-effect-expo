# CDD Expo Phase 4 Report — Genuine Local AI Explanation

## Objective

Add an optional, explicit, local AI explanation of existing NetworkX analysis
results without allowing AI to calculate, alter or persist operational data.

## Verified environment

- Ollama CLI: `ollama version is 0.40.16`
- `ollama list`: `qwen2.5:3b`, model digest `357c53fb659c`, 1.9 GB
- Tags endpoint: `http://localhost:11434/api/tags` returned the model.
- Direct real chat request to `/api/chat` returned `qwen2.5:3b real chat working`.
- A real FastAPI request returned a genuine campus explanation with
  `Actual Impact`, `Propagation Reason`, `Possible Improvements`, and an
  unknown-availability limitation.
- Browser retry received a genuine `qwen2.5:3b` response and displayed it with
  `AI-generated — review before acting`.

## Backend changes

- Added [`backend/app/ai_service.py`](../../backend/app/ai_service.py) for the
  configurable local Ollama client.
- Added `POST /api/v1/analysis-runs/{run_id}/ai-explanation`.
- The endpoint reuses tenant-scoped run, event, result and path services.
- Context is bounded to event metadata, the selected result, eight top results,
  and ten retained paths.
- Added timeout, connection, HTTP, missing-model, malformed-response and empty
  response handling.
- No AI action mutates SQLAlchemy records, NetworkX inputs, scoring values,
  confidence, dependencies or graph nodes/edges.

## Frontend changes

- Added a user-triggered **Explain with AI** panel to the selected analysis
  result.
- Added loading, success, human-review, error and retry states.
- Added the model label and clear separation between NetworkX-calculated facts
  and advisory suggestions.
- Preserved the direct North Campus Events landing and existing graph/workflow.

## Safety boundaries

- NetworkX remains the sole calculation engine.
- Scores remain heuristic estimates, not probabilities.
- Confidence remains dependency review quality, not likelihood.
- AI output is not written to the database.
- The prompt requires the model to distinguish graph facts from suggestions,
  mention unknown availability, and avoid fabricated rooms or slots.
- Ollama is loopback-only; React does not call it directly.

## Test and build results

- Backend full suite: **94 passed**.
- Backend AI service tests: success, unavailable, missing model, timeout and
  malformed response.
- Frontend full suite: **19 passed** across 4 files.
- Frontend ESLint, Prettier, typecheck and production build: passed.
- Backend Ruff format and lint: passed.
- OpenAPI snapshot: regenerated and includes the AI endpoint.

## Real unavailable-Ollama check

Ollama was stopped and its tags endpoint became unreachable. The core Events API
still returned organization-scoped records. The FastAPI AI endpoint returned
HTTP 503 with a friendly error and request ID. Ollama was restarted afterward.

## Limitation

AI text is model-generated and advisory. It is not operational confirmation,
and availability or mitigation facts still require human campus review.
