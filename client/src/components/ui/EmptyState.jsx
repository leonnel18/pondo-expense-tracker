import React from 'react';

// Reusable empty-state block (US-36, v1.5) — icon + message + optional
// action button, replacing the ad-hoc dashed/solid-bordered empty-state divs
// that previously existed independently across Entries/Accounts/RecycleBin/
// Recurrences/Budgets/TagsReport. Per the design system's "Empty state" spec
// (artifacts/02b-design-system.md), this keeps each instance's existing box
// structure (centered, bordered, rounded card) and copy — it only adds a
// small on-brand icon above the caption and centralizes the repeated markup.
const EmptyState = ({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  padding = 'p-12',
  className = '',
  children,
}) => {
  return (
    <div className={`text-center ${padding} border border-gray-200 rounded-lg ${className}`.trim()}>
      {Icon && (
        <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-brand-50 flex items-center justify-center">
          <Icon className="w-6 h-6 text-brand-400" strokeWidth={1.5} />
        </div>
      )}
      {title && <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>}
      {message && (
        <p className={actionLabel ? 'text-gray-500 mb-4' : 'text-gray-500'}>{message}</p>
      )}
      {children}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-brand-600 hover:text-brand-700 focus:outline-none transition-colors duration-150"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
