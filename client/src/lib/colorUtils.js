// Color helpers for the icon-in-circle transaction badges (US-11).
//
// WCAG 1.4.11 (non-text contrast) requires >=3:1 contrast for UI
// components against their surroundings — applied here as: the badge's
// tint background must clear >=3:1 contrast against the white row
// background it sits on, so pale/light stored colors never wash out the
// emoji glyph. Colors that fail this are progressively darkened rather
// than used raw.

const DEFAULT_FALLBACK_TINT = '#6B7280'; // neutral gray-500 — safe, accessible default
const MIN_CONTRAST = 3;
const WHITE = { r: 255, g: 255, b: 255 };

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
  const toHex = (c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function darken(rgb, amount) {
  return {
    r: rgb.r * (1 - amount),
    g: rgb.g * (1 - amount),
    b: rgb.b * (1 - amount),
  };
}

/**
 * Returns a hex color guaranteed to clear >=3:1 contrast against a white
 * background. Pale/light input colors are progressively darkened;
 * unparseable input falls back to a fixed neutral tint.
 */
export function getAccessibleTint(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return DEFAULT_FALLBACK_TINT;

  let candidate = rgb;
  let ratio = contrastRatio(candidate, WHITE);
  let amount = 0;
  while (ratio < MIN_CONTRAST && amount < 0.9) {
    amount += 0.1;
    candidate = darken(rgb, amount);
    ratio = contrastRatio(candidate, WHITE);
  }
  return rgbToHex(candidate);
}

// Accounts have no stored `color` column in the schema (only `emoji`) —
// see 04-code-docs.md deviation note. A fixed, deterministic palette keyed
// off account type stands in until/unless the schema grows one.
const ACCOUNT_TYPE_COLORS = {
  debit: '#1F7A64',
  credit: '#B45309',
  lent: '#5B6FBF',
  borrowed: '#B91C1C',
  invest: '#7C3AED',
};

export function getAccountTint(accountType) {
  return getAccessibleTint(ACCOUNT_TYPE_COLORS[accountType] || DEFAULT_FALLBACK_TINT);
}
