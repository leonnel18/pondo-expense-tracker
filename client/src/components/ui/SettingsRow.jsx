import React from 'react';
import { ChevronRight } from 'lucide-react';

// Reusable settings-row component (US-33, v1.4). Enabler for future
// settings-screen stories (US-41/US-43/D-12) — not wired into any page
// in this sprint.
//
// Two usage shapes, both supported by the same component:
//   - Navigation row: pass `onClick`, get a chevron-right on the right.
//   - Toggle/value row: pass `children` (or `action`) to render an
//     arbitrary right-aligned control (e.g. a switch, a value + chevron,
//     a button) instead of the default chevron.
//
// `color` sets the small icon chip's background (matches this project's
// existing convention of category/account chips using inline style for
// arbitrary hex colors — see Categories.jsx's Circle color usage — since
// Tailwind's static utility classes can't express arbitrary hex at runtime).
const SettingsRow = ({
  icon,
  color = '#3B82F6',
  label,
  description,
  onClick,
  chevron,
  children,
  action,
  className = '',
  ...props
}) => {
  const rightSlot = children ?? action;
  const isInteractive = typeof onClick === 'function';
  // Default: show the chevron only for plain navigation rows (onClick,
  // no explicit right-aligned content). Callers can force it either way.
  const showChevron = chevron ?? (isInteractive && rightSlot === undefined);

  const Wrapper = isInteractive ? 'button' : 'div';

  return (
    <Wrapper
      type={isInteractive ? 'button' : undefined}
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 px-4 py-3 bg-white text-left rounded-md',
        isInteractive
          ? 'hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors duration-150'
          : '',
        className,
      ].join(' ').trim()}
      {...props}
    >
      <span
        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
      </span>

      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-neutral-900 truncate">{label}</span>
        {description && (
          <span className="block text-xs text-neutral-500 mt-0.5 truncate">{description}</span>
        )}
      </span>

      {rightSlot !== undefined && (
        <span className="flex-shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
          {rightSlot}
        </span>
      )}

      {showChevron && rightSlot === undefined && (
        <ChevronRight className="flex-shrink-0 w-4 h-4 text-neutral-400" />
      )}
    </Wrapper>
  );
};

export default SettingsRow;
