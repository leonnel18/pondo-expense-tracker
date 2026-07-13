# Test Plan & UAT Report
**Project:** <name> · **Author:** qa · **Version:** 0.1 · **Date:** <date> · **Gate:** G6 (HARD)

## 1. Test cases
| ID | FR | Preconditions | Steps | Expected | Priority | Result (P/F) |
|----|----|---------------|-------|----------|:--------:|:------------:|
| TC-1 | FR-1 | | | | P0 | |
| TC-2 | | | | | | |

## 2. Edge & negative cases
| ID | Scenario | Expected | Result |
|----|----------|----------|--------|
| EC-1 | Amount = 0 or negative | rejected with 400 | |
| EC-2 | Empty dashboard (no data) | clean empty state | |
| EC-3 | Huge amount / long notes | handled gracefully | |
| EC-4 | Invalid / boundary date | rejected / correct bucket | |
| EC-5 | Delete last entry | dashboard recalculates | |

## 3. Defect log
| ID | Severity | Endpoint/Screen | Steps to reproduce | Expected | Actual | Status |
|----|----------|-----------------|--------------------|----------|--------|--------|
| D-1 | | | | | | open |

## 4. Results summary
- Cases run: __ · Passed: __ · Failed: __
- By priority: P0 __/__ · P1 __/__ · P2 __/__
- Open defects: P0 __ · P1 __ · P2 __

## 5. UAT script for Gino (walk through personally)
1. Add an expense → confirm it appears on the dashboard and totals update.
2. Add income → confirm balance changes.
3. Filter by last month → confirm numbers change correctly.
4. Edit an entry → confirm update. Delete one → confirm removal + recalculation.
5. Check category breakdown chart matches the entries.
6. Try an invalid amount → confirm it's rejected cleanly.

## 6. Verdict
**Recommendation:** PASS / FAIL — <rationale>
**Gino UAT sign-off (G6):** ____ on ____ · Notes: ____
