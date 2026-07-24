import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSettings, updateSettings } from '../lib/api';

// US-43 (v1.5): app-wide income/expense color-convention toggle. Mirrors
// PrivacyContext.jsx's exact pattern (fetch-on-mount, optimistic
// toggle-with-revert-on-failure) for the same reason PrivacyContext uses it —
// this is a single user preference read by many unrelated components
// (Entries.jsx, RecentEntries.jsx, BalanceHero.jsx, CalendarView.jsx,
// QuickAdd.jsx, AddEntry.jsx, AddEntryModal.jsx), so a context avoids
// prop-drilling through all of them.
const ColorConventionContext = createContext(null);

export function ColorConventionProvider({ children }) {
  const [swapped, setSwapped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((settings) => {
        if (cancelled) return;
        setSwapped(settings.swap_income_expense_colors === '1');
      })
      .catch(() => {
        if (!cancelled) setSwapped(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const setSwappedPersisted = useCallback((next) => {
    const prev = swapped;
    setSwapped(next);
    updateSettings({ swap_income_expense_colors: next ? '1' : '0' })
      .catch(() => {
        setSwapped(prev);
        console.error('Failed to persist swap_income_expense_colors setting');
      });
  }, [swapped]);

  const toggleSwapped = useCallback(() => {
    setSwappedPersisted(!swapped);
  }, [swapped, setSwappedPersisted]);

  const value = { swapped, toggleSwapped, setSwapped: setSwappedPersisted, loading };

  return <ColorConventionContext.Provider value={value}>{children}</ColorConventionContext.Provider>;
}

export function useColorConvention() {
  const context = useContext(ColorConventionContext);
  if (!context) {
    throw new Error('useColorConvention must be used within a ColorConventionProvider');
  }
  return context;
}
