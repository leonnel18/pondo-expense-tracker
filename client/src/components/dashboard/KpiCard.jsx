import React from 'react';

const KpiCard = ({ title, value, change, direction, subtitle, isIncome }) => {
  // Format currency — coerce null/undefined/NaN to 0 to avoid "₱NaN"
  const formatCurrency = (amount) => {
    const safe = (amount == null || Number.isNaN(amount)) ? 0 : amount;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safe);
  };

  // Format percentage — guard division by zero (previous = 0 → show "—")
  const formatPercentage = (percentage) => {
    if (percentage === null || percentage === undefined || !Number.isFinite(percentage)) return '—';
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  };

  // Get change color
  const getChangeColor = () => {
    if (change === null || change === undefined) return 'text-neutral-400';
    if (isIncome) {
      return direction === 'up' ? 'text-positive' : 'text-negative';
    } else {
      return direction === 'up' ? 'text-negative' : 'text-positive';
    }
  };

  // Get change icon
  const getChangeIcon = () => {
    if (change === null || change === undefined) return null;
    if (direction === 'up') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    } else if (direction === 'down') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-neutral-500 uppercase tracking-wide">{title}</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {typeof value === 'number' ? formatCurrency(value) : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
          )}
        </div>
        {change !== undefined && (
          <div className={`flex items-center text-sm font-medium ${getChangeColor()}`}>
            {getChangeIcon()}
            <span className="ml-1">{formatPercentage(change)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KpiCard;