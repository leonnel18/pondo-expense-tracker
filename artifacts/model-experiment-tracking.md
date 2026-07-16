# Model Experiment Tracking — dev/dev-pondo on glm-5.2:cloud

**Started:** 2026-07-16
**Why:** `qwen3-coder:480b-cloud` (dev/devops's original model) was retired by Ollama Cloud on 2026-07-15. After reassigning dev/devops/dev-pondo/devops-pondo to `deepseek-v4-pro:cloud` (which performed reliably — see baseline below), Gino asked to test `glm-5.2:cloud` for `dev` and `dev-pondo` specifically, to see how it compares. `architect`/`architect-pondo`/`devops`/`devops-pondo` remain on `deepseek-v4-pro:cloud` (unchanged, still proven).

**How results are checked:** Every dispatch's actual file diffs are read directly (not just the self-report) — same independent-verification discipline used all session. A dispatch counts as "clean" only if direct review found nothing wrong.

---

## Baseline — deepseek-v4-pro:cloud (dev/dev-pondo), this project, before the switch

| Dispatch | Real defects found on independent review |
|---|---|
| v2.1 recycle-bin/soft-delete (3-way split) | 1 — `Sidebar.jsx` missing `Wallet` import (runtime crash on every page load) |
| v2.2a transfers | 1 — wrong Zod schema imported (would have 400'd every transfer request) |
| v2.2b budgets backend | 2 — monthly cycle-math overflow bug; double `res.json()` call on empty-budgets path |
| v2.2b budgets frontend | 0 — clean |
| 8-bug post-launch fix batch | 2 — dead `document.cookie` auth check (httpOnly cookie unreadable by JS); migration would have silently dropped an earlier `search_path` security fix |

**Baseline: 5 dispatches, defects found in 4/5 (80%), 6 total real bugs caught.** Every dispatch still needed independent review — "reliable" meant "always produced usable, buildable output," not "bug-free."

---

## glm-5.2:cloud results (dev/dev-pondo)

| Date | Dispatch | Defects found on independent review |
|---|---|
| 2026-07-16 | v2.5 backend, attempt 1 (migration + `queries.js` calendar/tags functions + `entries.js` calendar route/tag_id filter) | **1 real defect** — `calendarQuerySchema`/`createTagSchema` were defined in `validate.js` but not included in `module.exports`, which would have made `GET /api/entries/calendar` 500 on every request (`validate(undefined)`). Otherwise the actual logic was notably careful: correctly pushed the `tag_id` pagination filter to the DB query level (a Medium-severity risk explicitly flagged in the design's own risk register), correctly distinguished `tagIds === undefined` ("don't touch tags") from `tagIds === []` ("clear all tags") in `updateEntry`, and correctly preserved the `.is()` vs `.eq()` NULL-matching fix from design review instead of "simplifying" it back to the buggy form. **The dispatch itself failed to complete** — hit a 120s LLM idle timeout after ~530s of work and several `apply_patch` sandbox-escape errors, leaving `server/routes/tags.js` never created and `server.js` never mounted. Not a correctness failure of the code produced, but a real reliability/completion problem — required a second, narrower follow-up dispatch to finish the remaining scope. |
| 2026-07-16 | v2.5 backend, attempt 2 (narrower follow-up: `server/routes/tags.js` + `server.js` mount only) | **0 defects** — clean. Route ordering (`/report` before `/:id`) correct, idempotent `POST /` status code (200 existing / 201 new) correct, error-response shape matched the existing codebase convention without inventing a new one, `server.js` require+mount both landed correctly. Completed in one pass, no timeout. |
