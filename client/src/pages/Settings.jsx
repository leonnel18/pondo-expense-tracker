import React, { useState, useEffect } from 'react';
import { Calendar, ArrowLeftRight, Flame, ClipboardList } from 'lucide-react';
import { getSettings, updateSettings, getEngagementStats } from '../lib/api';
import { useColorConvention } from '../contexts/ColorConventionContext';
import { normalizePeriodStartDay } from '../lib/periodPresets';
import SettingsRow from '../components/ui/SettingsRow';

// Small on/off switch — no dedicated reusable component exists yet in this
// app (checked ui/*.jsx); kept local since Settings.jsx is currently its
// only use.
const Switch = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
      checked ? 'bg-brand-600' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-150 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const Settings = () => {
  const { swapped, setSwapped } = useColorConvention();
  const [periodStartDay, setPeriodStartDayState] = useState(1);
  const [periodStartDayInput, setPeriodStartDayInput] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ lifetime_transaction_count: null, current_streak: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([getSettings(), getEngagementStats()]).then(([settingsResult, statsResult]) => {
      if (cancelled) return;

      if (settingsResult.status === 'fulfilled') {
        const day = normalizePeriodStartDay(settingsResult.value.period_start_day);
        setPeriodStartDayState(day);
        setPeriodStartDayInput(String(day));
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
      }

      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const persistPeriodStartDay = async (rawValue) => {
    const day = normalizePeriodStartDay(rawValue);
    setSaving(true);
    setError('');
    try {
      await updateSettings({ period_start_day: day });
      setPeriodStartDayState(day);
      setPeriodStartDayInput(String(day));
    } catch (err) {
      setError('Failed to save period start day: ' + err.message);
      // Revert the input back to the last-saved value
      setPeriodStartDayInput(String(periodStartDay));
    } finally {
      setSaving(false);
    }
  };

  const handlePeriodStartDayBlur = () => {
    persistPeriodStartDay(periodStartDayInput);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Preferences for how Pondo behaves for you.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2 px-1">
          Preferences
        </h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          <SettingsRow
            icon={<Calendar className="w-5 h-5" />}
            color="#2A9A7D"
            label="Period Start Day"
            description="Day of the month your 'This Month' / 'Last Month' presets start on (1-28)"
          >
            <input
              type="number"
              min={1}
              max={28}
              step={1}
              value={periodStartDayInput}
              disabled={loading || saving}
              onChange={(e) => setPeriodStartDayInput(e.target.value)}
              onBlur={handlePeriodStartDayBlur}
              className="w-16 rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-2 border text-center"
            />
          </SettingsRow>

          <SettingsRow
            icon={<ArrowLeftRight className="w-5 h-5" />}
            color="#5B6FBF"
            label="Swap Income/Expense Colors"
            description="Show income in red and expense in green instead of the default"
          >
            <Switch
              checked={swapped}
              onChange={setSwapped}
              label="Swap income/expense colors"
            />
          </SettingsRow>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2 px-1">
          Your Activity
        </h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          <SettingsRow
            icon={<Flame className="w-5 h-5" />}
            color="#E89C2A"
            label="Logging Streak"
            description="Consecutive days with at least one entry logged"
          >
            <span className="text-sm font-semibold text-neutral-900">
              {loading || stats.current_streak == null ? '—' : `${stats.current_streak} day${stats.current_streak === 1 ? '' : 's'}`}
            </span>
          </SettingsRow>

          <SettingsRow
            icon={<ClipboardList className="w-5 h-5" />}
            color="#1F7A64"
            label="Lifetime Transactions"
            description="Total entries logged since you started using Pondo"
          >
            <span className="text-sm font-semibold text-neutral-900">
              {loading || stats.lifetime_transaction_count == null ? '—' : stats.lifetime_transaction_count.toLocaleString()}
            </span>
          </SettingsRow>
        </div>
      </div>
    </div>
  );
};

export default Settings;
