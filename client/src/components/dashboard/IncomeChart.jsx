import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const IncomeChart = ({ data }) => {
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Chart colors from design system
  const chartColors = [
    '#1B8E4E',
    '#2A9A7D',
    '#45B095',
    '#F5B042',
    '#5B6FBF',
    '#8B5CF6'
  ];

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Income Breakdown</h3>
        <div className="border-2 border-dashed border-neutral-200 rounded-lg h-64 flex items-center justify-center">
          <p className="text-neutral-400">No income data available</p>
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">Income Breakdown</h3>
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
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              content={(props) => {
                const { payload } = props;
                return (
                  <ul className="flex flex-col space-y-2">
                    {payload.map((entry, index) => (
                      <li key={`item-${index}`} className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: entry.color }}
                        ></div>
                        <span className="text-sm text-neutral-700 truncate max-w-[100px]">
                          {entry.value}
                        </span>
                        <span className="ml-auto text-sm font-medium text-neutral-900">
                          {formatCurrency(chartData[index].total)}
                        </span>
                        <span className="ml-2 text-sm text-neutral-500">
                          ({((chartData[index].total / total) * 100).toFixed(1)}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default IncomeChart;