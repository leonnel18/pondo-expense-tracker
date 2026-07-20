import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCalendarMonth, getSettings, updateSettings } from '../../lib/api';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { MASK_PLACEHOLDER } from '../../lib/mask';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Normalize a Date to date-only (midnight local) for today comparison
const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatNet = (amount, masked) => {
  if (masked) return MASK_PLACEHOLDER;
  const safe = (amount == null || Number.isNaN(amount)) ? 0 : amount;
  const sign = safe > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe)}`;
};

const formatMonthLabel = (year, monthIdx) => {
  const d = new Date(year, monthIdx, 1);
  return d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
};

const CalendarView = ({ onDayClick }) => {
  const { masked } = usePrivacy();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth()); // 0-based
  const [data, setData] = useState(null); // { month, days: [{date, total_income, total_expense, net}] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tooltip state
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipLoaded, setTooltipLoaded] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);

  const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

  // Fetch calendar data on month change
  const fetchMonth = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCalendarMonth(monthKey);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  // First-use tooltip — only check once on mount
  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((settings) => {
        if (cancelled) return;
        if (settings.calendar_view_tooltip_dismissed !== '1') {
          setShowTooltip(true);
        }
        setTooltipLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        // If settings fail, default to not showing (avoid flash)
        setTooltipLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const dismissTooltip = async () => {
    setShowTooltip(false);
    setTooltipDismissed(true);
    try {
      await updateSettings({ calendar_view_tooltip_dismissed: '1' });
    } catch {
      // Non-fatal — tooltip is just UI
    }
  };

  const prevMonth = () => {
    setMonthIdx((prev) => {
      if (prev === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setMonthIdx((prev) => {
      if (prev === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  // Build the 6-row × 7-col grid (42 cells) with leading/trailing padding
  const firstDayOfWeek = new Date(year, monthIdx, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const today = todayStr();

  // Map day-of-month → day data for quick lookup
  const dayMap = {};
  if (data?.days) {
    data.days.forEach((d) => {
      dayMap[d.date] = d;
    });
  }

  // Build 42 cells: padding before, month days, padding after
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - firstDayOfWeek + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null); // padding cell
    } else {
      const dateStr = `${monthKey}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dayNum,
        dateStr,
        dayData: dayMap[dateStr] || { date: dateStr, total_income: 0, total_expense: 0, net: 0 },
        isToday: dateStr === today,
      });
    }
  }

  const handleCellClick = (cell) => {
    if (!cell) return;
    // Auto-dismiss tooltip on first day tap
    if (showTooltip && !tooltipDismissed) {
      dismissTooltip();
    }
    if (onDayClick) {
      onDayClick(cell.dateStr);
    }
  };

  const netColor = (net) => {
    if (net > 0) return 'text-green-600';
    if (net < 0) return 'text-red-600';
    return 'text-gray-400';
  };

  return (
    <div className="w-full">
      {/* Month/year header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {formatMonthLabel(year, monthIdx)}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* First-use tooltip */}
      {tooltipLoaded && showTooltip && (
        <div className="mb-3 flex items-center justify-between bg-brand-50 border border-brand-200 rounded-md px-4 py-2">
          <span className="text-sm text-brand-800">Tap any day to see its entries.</span>
          <button
            onClick={dismissTooltip}
            className="ml-3 text-sm text-brand-600 font-medium hover:text-brand-800 transition-colors whitespace-nowrap"
          >
            Got it
          </button>
        </div>
      )}

      {/* Error banner with retry */}
      {error && (
        <div className="mb-3 flex items-center justify-between bg-red-50 border border-red-200 rounded-md px-4 py-2">
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={fetchMonth}
            className="ml-3 text-sm text-red-600 font-medium hover:text-red-800 transition-colors whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — 6 rows × 7 cols */}
      <div className="grid grid-cols-7 gap-1">
        {loading ? (
          // Skeleton: 42 gray placeholder cells
          Array.from({ length: 42 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[80px] rounded-md bg-gray-100 animate-pulse"
            />
          ))
        ) : (
          cells.map((cell, i) => {
            if (!cell) {
              // Padding cell — empty/muted
              return <div key={i} className="min-h-[80px] rounded-md bg-gray-50" />;
            }
            const { dayNum, dayData, isToday } = cell;
            const hasEntries = dayData.total_income !== 0 || dayData.total_expense !== 0;
            return (
              <button
                key={i}
                onClick={() => handleCellClick(cell)}
                className={`min-h-[80px] rounded-md border p-2 text-left flex flex-col transition-colors hover:bg-gray-50 ${
                  isToday
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isToday ? 'text-brand-700' : 'text-gray-700'}`}>
                    {dayNum}
                  </span>
                  {hasEntries && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                  )}
                </div>
                <div className={`mt-auto text-sm font-semibold ${netColor(dayData.net)}`}>
                  {formatNet(dayData.net, masked)}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CalendarView;