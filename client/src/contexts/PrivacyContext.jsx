import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSettings, updateSettings } from '../lib/api';

const PrivacyContext = createContext(null);

export function PrivacyProvider({ children }) {
  const [masked, setMasked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch initial state on mount
  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((settings) => {
        if (cancelled) return;
        setMasked(settings.privacy_mask_enabled === '1');
      })
      .catch(() => {
        // If settings fail, default to unmasked
        if (!cancelled) setMasked(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const toggleMasked = useCallback(() => {
    const next = !masked;
    const prev = masked;
    // Optimistic update
    setMasked(next);
    // Persist to server
    updateSettings({ privacy_mask_enabled: next ? '1' : '0' })
      .catch(() => {
        // Revert on failure — an unexpectedly-unmasked screen is a privacy regression
        setMasked(prev);
        console.error('Failed to persist privacy mask setting');
      });
  }, [masked]);

  const value = { masked, toggleMasked, loading };

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
}