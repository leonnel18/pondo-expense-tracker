import React from 'react';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { MASK_PLACEHOLDER } from '../../lib/mask';

const formatCurrency = (amount, masked) => {
  if (masked) return MASK_PLACEHOLDER;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount);
};

const formatDate = (dateStr) => {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

const getBarColor = (percent, categoryColor) => {
  if (percent >= 100) return '#D14343';
  if (percent >= 75) return '#E89C2A';
  return categoryColor || '#1F7A64';
};

const getCycleLabel = (cycle) => {
  return cycle.charAt(0).toUpperCase() + cycle.slice(1);
};

const BudgetProgressBar = ({
  category_name,
  category_color,
  category_icon,
  amount,
  spend,
  percent,
  remaining,
  cycle,
  current_cycle_start,
  current_cycle_end
}) => {
  const { masked } = usePrivacy();
  const barColor = getBarColor(percent, category_color);
  const clampedWidth = Math.min(percent, 100);

  return (
    <div className="space-y-1">
      {/* Header: icon + name + percent */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {category_icon && (
            <span className="text-lg">{category_icon}</span>
          )}
          <span className="text-sm font-medium text-gray-900">{category_name}</span>
        </div>
        <span className="text-sm font-semibold text-gray-700">
          {Math.round(percent)}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="bg-gray-200 rounded-full h-2 w-full overflow-hidden"
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${clampedWidth}%`,
            backgroundColor: barColor
          }}
        />
      </div>

      {/* Spend / remaining line */}
      <p className="text-xs text-gray-600">
        {percent >= 100 ? (
          <span className="text-red-600 font-medium">
            Overspent by {formatCurrency(Math.abs(remaining), masked)}
          </span>
        ) : (
          <>
            {formatCurrency(spend, masked)} spent of {formatCurrency(amount, masked)} · {formatCurrency(remaining, masked)} remaining
          </>
        )}
      </p>

      {/* Cycle info */}
      <p className="text-xs text-gray-400">
        {getCycleLabel(cycle)} · {formatDate(current_cycle_start)} – {formatDate(current_cycle_end)}
      </p>
    </div>
  );
};

export default BudgetProgressBar;
