# CDD Expo Phase 0 Report — Verify seeded demo identities

## 1. Objective

Confirm the frontend demo identity presets are derived from the actual
deterministic seed implementation and prove the North Campus preset connects
to the existing local seeded backend without changing database contents.

## 2. Work completed

- Read the complete `backend/app/seed.py` and `backend/app/auth.py`.
- Confirmed `SEED_NAMESPACE` is
  `https://ripple-effect.invalid/synthetic-demo/` and `_id(key)` returns
  `uuid5(NAMESPACE_URL, f"{SEED_NAMESPACE}{key}")`.
- Independently derived the organization and user IDs for seed keys
  `org-campus`, `user-campus`, `org-transport`, and `user-transport`.
- Compared all values with the four presets in `frontend/src/App.tsx`; every
  value matches. No UUID correction was needed.
- Started the local API against the already existing
  `backend/ripple_effect.sqlite3`, with development local-auth explicitly
  enabled, and connected the North Campus preset through the browser.
- Confirmed the real API returned readiness and organization-scoped event,
  entity, and dependency collections. The browser displayed `North Campus
  Demo` and its synthetic-data notice.
- No migration, seed command, database write, reset, or record deletion was
  performed.

## 3. Decisions

- Retain the current preset UUIDs; they are the exact UUIDv5 values produced by
  the repository's seed namespace and keys.
- Preserve the existing development-only local-auth guard and server-side
  membership lookup.
- Do not infer demo event selection from the successful tenant connection.
  The current app initially selected a different existing event (`Tornado`);
  Phase 2 will explicitly focus the seeded campus event without changing data.

## 4. Verification performed

| Command/check | Result | Evidence |
|---|---|---|
| Read `backend/app/seed.py` and `backend/app/auth.py` | PASS | Seed namespace/helper/keys and local-auth/member checks inspected |
| UUIDv5 derivation with `uuid.NAMESPACE_URL` and the exact seed namespace/keys | PASS | `org-campus=2207381a-f0fe-5671-9507-7e4fd71ea55d`; `user-campus=40f3a390-3e0b-5bf4-bb3b-aad260f8120a`; `org-transport=31bcea90-556d-55da-a917-45f72a00263d`; `user-transport=afa077dc-a671-5d20-811b-445377c17d3d` |
| `GET /api/v1/health/ready` and seeded collection GETs with North Campus headers | PASS | Readiness `ready`; 4 events, 11 entities, 11 dependencies |
| Browser preset selection and connection against the real Vite/API/SQLite stack | PASS | Header identifies North Campus Demo; records and synthetic notice rendered |
| Database mutation/seed/reset | NOT RUN | Existing database contents preserved |

## 5. Test results

- UUID derivation and live API/UI checks passed.
- No code was changed in this verification phase; unit tests were not rerun
  here.
- No database reset or seed run was used.

## 6. Security and data integrity

- Local authentication was enabled only for the local development API process.
- The API still resolved the exact active membership from the supplied user
  and organization IDs.
- Requests were read-only. The existing SQLite database was not seeded,
  migrated, reset, or modified by this verification.
- No remote services or credentials were used.

## 7. Evidence integrity

- All four IDs were calculated from the exact code-level seed namespace and
  seed keys; they were not guessed.
- Real API collection responses and the browser connection were observed.
- The database already contained four events, 11 entities, and 11
  dependencies for this organization; this report does not claim that all
  existing events were created by the seed.

## 8. Deviations and blockers

- The instruction suggested the existing UUIDs may use an arbitrary namespace;
  source inspection and independent calculation show they match the actual
  seed exactly, so no change was appropriate.
- The browser connected successfully but selected `Tornado` first, not the
  campus demo event. This is a Phase 2 walkthrough issue, not an identity or
  authorization failure.

## 9. Progress file

`docs/progress.md` records the derivation, real-backend result, read-only
database handling, and current expo phase. Current branch is
`feature/ripple-demo-transformation`; checkpoint `d226b2b` remains present.

## 10. Human review required

- Review the observed UUID derivation and confirm retaining the matching
  presets.
- Review the Phase 2 event-selection improvement against the extra events
  already present in the local database.

## 11. Phase exit assessment

- Exit criteria met: **YES**.
- Evidence-backed explanation: all four UUIDs independently match the actual
  seed implementation; the North Campus identity passed live API membership
  checks and connected through the browser to the existing SQLite-backed API.
- Recommended next phase: CDD Expo Phase 2 — guided campus walkthrough.
