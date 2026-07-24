import React from 'react';

// Compact colored-dot chart legend (US-35, v1.5) — a small dot + short label
// per series/category, wrapping across multiple lines. Replaces the bulkier
// in-chart recharts <Legend> list (dot + label + amount + percentage,
// rendered to the side of the pie) previously duplicated in
// ExpenseChart.jsx/IncomeChart.jsx — this renders above the pie instead, so
// the pie itself gets the full card width.
const ChartLegend = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
      {items.map((item, index) => (
        <div key={item.id ?? index} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-neutral-600 truncate max-w-[140px]">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default ChartLegend;
