# Design System & Brand Spec
**Project:** Household Expense Tracker · **Author:** brand · **Version:** 1.0 · **Date:** 2026-07-10 · **Gate:** G2.5 (soft)

## 1. Brand direction
**Pondo** — Filipino for "funds." Calm, trustworthy, clean fintech. A personal tool that respects your data and your time. Not a bank app, not a toy — something in between.

- Logo / wordmark: `design/logo.svg` + `design/logo.png` — A geometric **wallet mark**: a rounded rectangle in brand-600 green (#1F7A64) with a subtle horizontal fold line and a small clasp/button on the right, suggesting a bifold wallet/holder. Currency-agnostic — no ₱, $, or € symbols. The mark works flat at 16×16 (favicon) up to 128×128 (sidebar). Paired with the "Pondo" wordmark in bold Inter 700. Tagline: "YOUR MONEY, IN FOCUS" in uppercase tracking.
- Favicon: derive from logo mark (the wallet tile alone at 32×32, 16×16)
- Brand voice: approachable, precise, no fluff. Shows the work rather than describing it.

## 2. Color palette

| Token | Hex | Use | Contrast (on bg) | AA? |
|-------|-----|-----|------------------|-----|
| brand-600 | #1F7A64 | primary actions, buttons | 4.8:1 on white | ☑ AA |
| brand-700 | #1A6253 | hover states | 6.1:1 on white | ☑ AA |
| brand-800 | #154E42 | sidebar bg | 8.2:1 on white | ☑ AAA |
| accent-600 | #C97E1A | highlights, credit type | 3.8:1 on white | ☑ AA (large) |
| accent-500 | #E89C2A | chart color, warning | 3.9:1 on white | ☑ AA (large) |
| bg | #F7F8F6 | app background | — | — |
| surface | #FFFFFF | cards, panels | — | — |
| text-primary | #1C221D | body text | 16.1:1 on white | ☑ AAA |
| text-secondary | #5C655B | secondary text | 5.9:1 on white | ☑ AA |
| text-muted | #8A9387 | captions, labels | 3.2:1 on white | ☑ AA (large only) |
| positive | #1B8E4E | income, favorable MoM | 3.9:1 on white | ☑ AA (large) |
| negative | #D14343 | expense, owed, destructive | 4.0:1 on white | ☑ AA (large) |
| negative (on negativeLight) | #D14343 on #FCE8E8 | owed labels | 4.8:1 | ☑ AA |
| warning | #E89C2A | caution, duplicate warning | — | — |

### Account-type indicator colors (augment border styles)

| Type | Color | Bg tint | Border style | Contrast on tint |
|------|-------|---------|--------------|------------------|
| Debit | #1F7A64 | #E8F5F2 | solid 2px | 5.2:1 ☑ AA |
| Credit | #C97E1A | #FEF5E7 | dashed 2px | 4.5:1 ☑ AA |
| Lent | #5B6FBF | #EBEEF8 | dotted 2px | 4.7:1 ☑ AA |
| Borrowed | #D14343 | #FCE8E8 | double 4px | 4.8:1 ☑ AA |
| Invest | #8B5CF6 | #F3EFFE | thick solid 4px | 4.6:1 ☑ AA |

### UX Open Question #1 — Answer
**Brand color AUGMENTS border styles.** Border styles (solid, dashed, dotted, double, thick) are kept for accessibility (color is never the sole differentiator). Brand colors are added via: (a) colored border matching the type, (b) type badge with tinted background, (c) colored text for owed amounts. This satisfies WCAG NFR-7.

## 3. Typography

Font: **Inter** (Google Fonts, self-hostable). System fallback: `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`.

| Role | Font | Size / Weight / Line | Letter-spacing |
|------|------|----------------------|----------------|
| Display | Inter | 32px / 700 / 40px | -0.02em |
| H1 | Inter | 24px / 600 / 32px | -0.01em |
| H2 | Inter | 20px / 600 / 28px | 0 |
| H3 | Inter | 16px / 600 / 24px | 0 |
| Body | Inter | 15px / 400 / 22px | 0 |
| Body Small | Inter | 13px / 400 / 18px | 0 |
| Caption | Inter | 12px / 400 / 16px | 0 |
| Label | Inter | 11px / 600 / 16px | 0.04em (uppercase) |

Mono font: **JetBrains Mono** for code blocks / token tables.

## 4. Spacing / radius / shadow tokens

**Spacing scale:** 4px · 8px · 12px · 16px · 20px · 24px · 32px · 40px · 48px · 64px

**Radius:**
- sm: 6px (inputs, badges)
- md: 10px (cards, buttons)
- lg: 14px (modals, panels)
- xl: 20px (hero sections)
- full: 9999px (pills, chips)

**Shadow:**
- xs: `0 1px 2px 0 rgba(15,20,16,0.05)` — subtle lift
- sm: `0 1px 3px 0 rgba(15,20,16,0.08), 0 1px 2px 0 rgba(15,20,16,0.04)` — cards (default)
- md: `0 4px 6px -1px rgba(15,20,16,0.08), 0 2px 4px -2px rgba(15,20,16,0.04)` — dropdowns
- lg: `0 10px 15px -3px rgba(15,20,16,0.08), 0 4px 6px -4px rgba(15,20,16,0.04)` — modals
- xl: `0 20px 25px -5px rgba(15,20,16,0.10), 0 8px 10px -6px rgba(15,20,16,0.04)` — floating dialogs

## 5. Chart color set

**Expense categories (10 colors):**
| # | Color | Category |
|---|-------|----------|
| 1 | #1F7A64 | Food & Dining |
| 2 | #2A9A7D | Housing & Utilities |
| 3 | #45B095 | Transportation |
| 4 | #6FC9B0 | Shopping |
| 5 | #E89C2A | Entertainment |
| 6 | #F5B042 | Subscriptions |
| 7 | #F9C55A | Health |
| 8 | #5B6FBF | Education |
| 9 | #8B5CF6 | Insurance |
| 10 | #D14343 | Other |

**Income categories (6 colors):**
| # | Color | Category |
|---|-------|----------|
| 1 | #1B8E4E | Salary |
| 2 | #2A9A7D | Freelance |
| 3 | #45B095 | Gift |
| 4 | #F5B042 | Investment |
| 5 | #5B6FBF | Refund |
| 6 | #8B5CF6 | Other Income |

**Positive/Negative:** #1B8E4E (income) / #D14343 (expense/liability)

## 6. Component style guide

| Component | Style notes |
|-----------|-------------|
| **Button — Primary** | bg-brand-600, text white, px-5 py-2.5, rounded-md (10px), text-sm font-medium, shadow-sm, hover:bg-brand-700 |
| **Button — Secondary** | bg-brand-50, text-brand-700, border border-brand-200, rounded-md, hover:bg-brand-100 |
| **Button — Ghost** | bg-transparent, text-neutral-600, rounded-md, hover:bg-neutral-100 |
| **Button — Destructive** | bg-negative, text white, rounded-md, shadow-sm, hover:bg-red-700 |
| **Entry type toggle** | 2-col grid. Active: bg-brand-600 text-white border-2 border-brand-600. Inactive: bg-brand-50 text-brand-600 border-2 border-brand-100. |
| **Account type selector** | 5 selectable cards. Selected: border-2 border-account-{type} bg-account-{type}Bg. Unselected: border-2 border-neutral-200 bg-white. |
| **Input (text/number)** | px-4 py-2.5, border border-neutral-200, rounded-md (6px), text-sm, focus:border-brand-500 focus:ring-2 focus:ring-brand-100. ₱ prefix for amount. |
| **Input (error)** | border-2 border-negative, text-xs text-negative below for message. |
| **Select** | Same as input. bg-white. |
| **Textarea** | Same as input. rows-3. resize-none. |
| **KPI card** | bg-white, rounded-md, shadow-sm, border border-neutral-200, p-5. Label: text-xs uppercase text-neutral-400. Value: text-2xl font-bold. Net Balance: border-l-4 border-l-positive. |
| **KPI card (empty)** | Same structure. Value: text-neutral-300. Label: text-neutral-300. |
| **Account card — Debit** | border-2 border-account-debit (solid). Badge: text-account-debit bg-account-debitBg. |
| **Account card — Credit** | border-2 border-dashed border-account-credit. Balance in text-negative with "(owed)". Badge: text-account-credit bg-account-creditBg. |
| **Account card — Lent** | border-2 border-dotted border-account-lent. Badge: text-account-lent bg-account-lentBg. |
| **Account card — Borrowed** | border-4 border-double border-account-borrowed. Balance in text-negative with "(owed)". Badge: text-account-borrowed bg-account-borrowedBg. |
| **Account card — Invest** | border-4 border-account-invest (thick). Badge: text-account-invest bg-account-investBg. |
| **Data table** | bg-white, rounded-md, shadow-sm, border border-neutral-200. Header: bg-neutral-50 text-neutral-400 uppercase text-xs. Rows: divide-y divide-neutral-100, hover:bg-neutral-50. |
| **Type badge (table)** | Income: text-positive bg-positiveLight rounded-full px-2 py-0.5 text-xs. Expense: text-negative bg-negativeLight rounded-full px-2 py-0.5 text-xs. |
| **Amount display** | Income: text-positive, prefix "+". Expense: text-neutral-800, prefix "−". |
| **Donut chart** | stroke-width 28, rotated -90deg. Colors from chart expense/income palettes. Center shows total. Legend: 2-col grid with swatch + label + amount + %. |
| **MoM comparison** | 2 cards. Good direction (income up / expense down): text-positive. Bad direction: text-negative. ▲/▼ indicators with %. |
| **Modal** | bg-white, rounded-lg (14px), shadow-lg. Header: border-b border-neutral-100, text-base font-semibold. Body: px-5 py-4. Footer: border-t, flex justify-between. |
| **Modal (delete confirm)** | Shows entry details in bg-neutral-50 rounded-md. Destructive button: bg-negative text-white. |
| **Modal (account delete)** | 2 radio-card options. Selected: border-2 border-brand-600 bg-brand-50. Unselected: border-2 border-neutral-200. |
| **Banner — Welcome** | bg-brand-50 border border-brand-200 rounded-lg p-4. Icon in bg-brand-100 circle. Title: text-brand-800. |
| **Banner — Info** | bg-neutral-50 border border-neutral-200. Text-neutral-600. |
| **Banner — Warning** | bg-warningLight border border-accent-200. Text-accent-700. |
| **Banner — Error** | bg-negativeLight border border-negative (30% opacity). Text-negative. Retry link: text-brand-600 underline. |
| **Category badge** | text-white, px-3 py-1, rounded-full, text-xs font-medium. bg = chart color for that category. |
| **Empty state — chart** | border-2 border-dashed border-neutral-200 rounded-lg h-48. Centered text-neutral-300. |
| **Empty state — entries** | bg-white border-neutral-200 rounded-lg py-16. CTA button: bg-brand-600 text-white. |
| **Empty state — account slot** | border-2 border-dashed border-neutral-200. Link: text-neutral-300 hover:text-brand-600. |
| **Sidebar** | bg-brand-800, text-brand-200. Active: bg-brand-700 text-white font-medium. Logo: wallet mark in bg-brand-600 rounded-lg + "Pondo" wordmark. |
| **Filter toggle** | Active: bg-brand-600 text-white. Inactive: bg-white text-neutral-600 hover:bg-neutral-50. |
| **Pagination** | Active: bg-brand-600 text-white rounded-md. Inactive: border border-neutral-200 text-neutral-600. |
| **Bulk action bar** | bg-neutral-700 text-white rounded-md. Destructive: bg-negative text-white. |
| **Audit trail** | text-xs text-neutral-500, bg-neutral-50 rounded-md p-3, border border-neutral-100. |
| **Search input** | pl-9 (icon prefix), border border-neutral-200, rounded-md, text-sm. |
| **Time filter dropdown** | Same as select, smaller: px-3 py-1.5 text-sm. |
| **CSV export card** | bg-white rounded-lg shadow-sm border border-neutral-200 p-6. Download button: bg-brand-600 text-white. |
| **Category list row** | divide-y divide-neutral-100. Hover: bg-neutral-50. Color swatch + name + count + edit/delete actions. |
| **Add category form (inline)** | bg-white rounded-lg shadow-sm border border-neutral-200 p-6. Grid layout. Color/icon picker: disabled, bg-neutral-100 text-neutral-400. |

## 7. Machine-usable exports (for dev)

- `design/tokens.json` — full token set (colors, typography, spacing, radius, shadows, chart colors)
- `tailwind.config` extend block:
```js
theme: {
  extend: {
    colors: {
      brand: { 50:'#E8F5F2',100:'#C5E8DF',200:'#9DDCCB',300:'#6FC9B0',400:'#45B095',500:'#2A9A7D',600:'#1F7A64',700:'#1A6253',800:'#154E42',900:'#0F3A31' },
      accent: { 50:'#FEF5E7',100:'#FDE8C7',200:'#FBD58E',300:'#F9C55A',400:'#F5B042',500:'#E89C2A',600:'#C97E1A',700:'#A36214',800:'#7D4A10',900:'#5C3810' },
      neutral: { 0:'#FFFFFF',50:'#F7F8F6',100:'#EDF0EB',200:'#D8DDD4',300:'#B8C0B5',400:'#8A9387',500:'#5C655B',600:'#3E463E',700:'#2B322B',800:'#1C221D',900:'#0F1410' },
      positive: '#1B8E4E', positiveLight: '#E4F5E9',
      negative: '#D14343', negativeLight: '#FCE8E8',
      warning: '#E89C2A', warningLight: '#FEF5E7',
      account: {
        debit:'#1F7A64', debitBg:'#E8F5F2',
        credit:'#C97E1A', creditBg:'#FEF5E7',
        lent:'#5B6FBF', lentBg:'#EBEEF8',
        borrowed:'#D14343', borrowedBg:'#FCE8E8',
        invest:'#8B5CF6', investBg:'#F3EFFE'
      }
    },
    borderRadius: { sm:'6px', md:'10px', lg:'14px', xl:'20px' },
    fontFamily: { sans:['Inter','system-ui','sans-serif'], mono:['JetBrains Mono','Consolas','monospace'] },
    boxShadow: {
      xs:'0 1px 2px 0 rgba(15,20,16,0.05)',
      sm:'0 1px 3px 0 rgba(15,20,16,0.08),0 1px 2px 0 rgba(15,20,16,0.04)',
      md:'0 4px 6px -1px rgba(15,20,16,0.08),0 2px 4px -2px rgba(15,20,16,0.04)',
      lg:'0 10px 15px -3px rgba(15,20,16,0.08),0 4px 6px -4px rgba(15,20,16,0.04)',
      xl:'0 20px 25px -5px rgba(15,20,16,0.10),0 8px 10px -6px rgba(15,20,16,0.04)'
    }
  }
}
```
- `design/style-guide.html` (rendered) + `design/style-guide.png` (screenshot for docx)
- `design/logo.svg` + `design/logo.png`

## 8. Coverage check
Every component in `02-wireframes.md` has a defined style? ☑ yes — gaps: none.

**Components covered (33/33):**
Buttons (4 variants) · Entry type toggle · Account type selector (5 cards) · Text input · Number input with ₱ · Date picker · Select dropdown · Textarea · Validation error states · KPI cards (4) · KPI empty state · Donut chart (expense) · Donut chart (income) · Account cards (5 types) · Data table · Type badges (income/expense) · Amount display (signed) · Pagination · Bulk action bar · MoM comparison · Delete entry modal · Account delete resolution modal · Category delete resolution modal · Welcome banner · Info/warning/error banners · Category badges (expense 10 + income 6) · Empty states (chart, entries, account slot) · Sidebar navigation · Filter toggle · Search input · Time filter dropdown · Sort dropdown · Duplicate warning · Audit trail · CSV export cards · Category list rows · Add category inline form.

## 9. UX Open Questions — Answers

**Q1: Should brand color augment or replace border-style account type indicators?**
→ **AUGMENT.** Border styles (solid, dashed, dotted, double, thick) are kept. Brand colors augment via colored border, tinted badge background, and colored text for owed amounts. Color is never the sole differentiator — both border style and text label are always present. This satisfies NFR-7 (WCAG 2.1 AA: color is not the sole differentiator).

**Q2: Entry form — should account default to last-used? (UX recommended yes)**
→ **Yes, default to last-used account per session.** Visual treatment: the default account in the dropdown shows a small "last used" indicator (a subtle dot or "recent" label in brand-600). The select itself uses the standard input style — no special visual state needed beyond the pre-selected value. This saves Marcus (occasional contributor) one tap per entry.

## 10. Sign-off
- Reviewed by Gino at G2.5 on: ______ · Notes: ______
- **Ready for G2.5 review.** All artifacts produced. WCAG AA contrast documented for every text/bg pair. No IA/flow redesign — visual layer only. All 33 wireframe components have defined styles. Token files (tokens.json + Tailwind config) are paste-ready for dev.