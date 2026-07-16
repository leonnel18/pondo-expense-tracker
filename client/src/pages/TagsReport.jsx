import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTagsReport } from '../lib/api';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Chart colors — same palette as ExpenseChart.jsx
const TAG_COLORS = [
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

const TagsReport = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState({ from: '', to: '', tags: [] });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await getTagsReport(from, to);
      setReport(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch tags report');
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tagId) => {
    navigate(`/entries?tag_id=${tagId}`);
  };

  const handleClearDates = () => {
    setFrom('');
    setTo('');
  };

  const tags = report.tags || [];
  const maxAmount = tags.length > 0 ? Math.max(...tags.map(t => t.total_amount)) : 0;

  if (loading) return <div className="p-6">Loading tags report...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tags Report</h1>
        <p className="text-gray-600 mt-1">Spending breakdown by tag</p>
      </div>

      {/* Date range picker — same input styling as FilterPanel.jsx */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
            />
          </div>
        </div>
        {(from || to) && (
          <div className="flex justify-end mt-3">
            <button
              onClick={handleClearDates}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
            >
              Clear Dates
            </button>
          </div>
        )}
      </div>

      {/* Tag list — sorted by total_amount desc (server-side), bar-style rows */}
      {tags.length === 0 ? (
        <div className="text-center p-8 border border-gray-200 rounded-lg">
          <p className="text-gray-500">No tagged entries found for this date range</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Spending by Tag</h2>
            <span className="text-sm text-gray-500">{tags.length} tag{tags.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-3">
            {tags.map((tag, index) => {
              const pct = maxAmount > 0 ? (tag.total_amount / maxAmount) * 100 : 0;
              const color = TAG_COLORS[index % TAG_COLORS.length];
              return (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag.id)}
                  className="block w-full text-left group focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-md transition-colors duration-150"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 group-hover:text-brand-700">
                      {tag.name}
                    </span>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">
                        {tag.entry_count} {tag.entry_count === 1 ? 'entry' : 'entries'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(tag.total_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-200"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    ></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsReport;