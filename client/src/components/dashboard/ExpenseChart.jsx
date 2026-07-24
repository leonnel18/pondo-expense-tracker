import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { MASK_PLACEHOLDER } from '../../lib/mask';
import ChartLegend from './ChartLegend';

const ExpenseChart = ({ data }) => {
  const { masked } = usePrivacy();

  // Format currency
  const formatCurrency = (amount) => {
    if (masked) return MASK_PLACEHOLDER;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Chart colors from design system
  const chartColors = [
    '#1F7A64',
    '#2A9A7D',
    '#45B095',
    '#6FC9B0',
    '#E89C2A',
    '#F5B042',
    '#F9C55A',
    '#5B6FBF',
    '#8B5CF6',
    '#D14343'
  ];

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Expense Breakdown</h3>
        <div className="border-2 border-dashed border-neutral-200 rounded-lg h-64 flex items-center justify-center">
          <p className="text-neutral-400">No expense data available</p>
        </div>
      </div>
    );
  }

  // Prepare data for chart
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.category_color || chartColors[index % chartColors.length]
  }));

  // Calculate total for percentage calculation
  const total = chartData.reduce((sum, item) => sum + item.total, 0);

  // US-35: compact colored-dot legend items, rendered above the pie via
  // <ChartLegend/> instead of the previous in-chart recharts <Legend>.
  const legendItems = chartData.map((item) => ({
    id: item.id,
    label: item.category_name,
    color: item.color,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
      <h3 className="text-lg font-semibold text-neutral-900 mb-1">Expense Breakdown</h3>
      <ChartLegend items={legendItems} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="total"
              nameKey="category_name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${formatCurrency(value)} (${((value / total) * 100).toFixed(1)}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ExpenseChart;