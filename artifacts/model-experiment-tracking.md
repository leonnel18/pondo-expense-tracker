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
| _(pending first dispatch)_ | | |
