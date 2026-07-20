import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { MASK_PLACEHOLDER } from '../../lib/mask';

const RecentEntries = ({ entries, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { masked } = usePrivacy();
  const formatCurrency = (amount) => {
    if (masked) return MASK_PLACEHOLDER;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center p-8 border border-gray-200 rounded-lg">
        <p className="text-gray-500">No recent entries</p>
        <button
          onClick={() => navigate('/entries')}
          className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-brand-600 hover:text-brand-700 focus:outline-none transition-colors duration-150"
        >
          Add your first entry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center">
            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
              entry.type === 'income' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {entry.category_emoji && (
                <span className="text-lg">{entry.category_emoji}</span>
              )}
            </div>
            <div className="ml-4">
              <div className="flex items-center">
                {entry.category_emoji && (
                  <span className="text-lg mr-2">{entry.category_emoji}</span>
                )}
                <h3 className="text-sm font-medium text-gray-900">{entry.category_name}</h3>
              </div>
              <div className="flex items-center mt-1">
                {entry.pending && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 border border-amber-200 text-amber-800 mr-2">
                    Pending
                  </span>
                )}
                {entry.account_emoji && (
                  <span className="text-sm mr-1">{entry.account_emoji}</span>
                )}
                <p className="text-sm text-gray-500">{entry.account_name}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="text-right mr-4">
              <p className={`text-sm font-medium ${
                entry.type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}>
                {masked ? formatCurrency(entry.amount) : `${entry.type === 'income' ? '+' : '-'}${formatCurrency(entry.amount)}`}
              </p>
              <p className="text-xs text-gray-500">
                {format(new Date(entry.date), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => onEdit(entry)}
                className="p-1 text-gray-500 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded transition-colors duration-150"
                aria-label="Edit entry"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                className="p-1 text-gray-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded transition-colors duration-150"
                aria-label="Delete entry"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentEntries;