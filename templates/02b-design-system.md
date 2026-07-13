# Design System & Brand Spec
**Project:** <name> · **Author:** brand · **Version:** 0.1 · **Date:** <date> · **Gate:** G2.5 (soft)

## 1. Brand direction
<Name + one-line mood; e.g. "Ledger — calm, trustworthy, clean fintech.">
- Logo / wordmark: `design/logo.svg|png` (generated) — describe concept
- Favicon: `design/favicon.png`

## 2. Color palette
| Token | Hex | Use | Contrast (on bg) | AA? |
|-------|-----|-----|------------------|-----|
| brand-600 | #______ | primary actions | __:1 | ☐ |
| accent-500 | #______ | highlights | __:1 | ☐ |
| bg | #______ | app background | — | — |
| surface | #______ | cards | — | — |
| text | #______ | body | __:1 | ☐ |
| positive | #______ | income | | |
| negative | #______ | expense | | |

## 3. Typography
| Role | Font | Size / Weight / Line |
|------|------|----------------------|
| Display | | 32 / 700 / 40 |
| H1 | | 24 / 600 / 32 |
| Body | | 15 / 400 / 22 |
| Caption | | 12 / 400 / 16 |

## 4. Spacing / radius / shadow tokens
Spacing scale: 4, 8, 12, 16, 24, 32 · Radius: sm __ / md __ / lg __ · Shadow: card __

## 5. Chart color set
Categorical (6): #__ #__ #__ #__ #__ #__ · positive/negative as above

## 6. Component style guide
| Component | Style notes |
|-----------|-------------|
| Button (primary/secondary/ghost) | |
| Input / select | |
| KPI card | |
| Table row | |
| Chart (donut/bar) | color mapping |

## 7. Machine-usable exports (for dev)
- `design/tokens.json` — full token set
- `tailwind.config` extend block:
```js
theme: { extend: {
  colors: { brand: "#______", accent: "#______", positive: "#______", negative: "#______" },
  borderRadius: { md: "__px" },
  fontFamily: { sans: ["Inter", "system-ui"] }
} }
```
- `design/style-guide.html` (rendered) + `design/style-guide.png` (screenshot for docx)

## 8. Coverage check
Every component in `02-wireframes.md` has a defined style? ☐ yes — gaps: ____

## 9. Sign-off
- Reviewed by Gino at G2.5 on: ____ · Notes: ____
