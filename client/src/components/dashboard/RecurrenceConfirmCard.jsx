import React, { useState, useEffect } from 'react';
import { getDueRecurrences, confirmRecurrence } from '../../lib/api';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount);
};

// Unlike BudgetCard, this card renders nothing at all when the queue is
// empty — an empty confirm-queue is just the normal state, not something
// to promote with an empty-state prompt.
const RecurrenceConfirmCard = () => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDue();
  }, []);

  const fetchDue = async () => {
    try {
      setLoading(true);
      const data = await getDueRecurrences();
      setPending(data || []);
    } catch {
      // Silently fail — same reasoning as BudgetCard, this is a secondary
      // dashboard surface, not the primary flow.
      setPending([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id) => {
    try {
      setConfirmingId(id);
      setError('');
      await confirmRecurrence(id);
      setPending((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to confirm entry');
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading || pending.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Confirm Recurring Items</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {pending.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
          >
            <div className="flex items-center min-w-0">
              {r.category_icon && (
                <span className="text-xl mr-2 flex-shrink-0">{r.category_icon}</span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.category_name}</p>
                <p className="text-xs text-gray-500">{formatCurrency(r.amount)}</p>
              </div>
            </div>
            <button
              onClick={() => handleConfirm(r.id)}
              disabled={confirmingId === r.id}
              className="ml-2 flex-shrink-0 px-3 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150 disabled:opacity-50"
            >
              {confirmingId === r.id ? 'Confirming...' : `Confirm ${formatCurrency(r.amount)}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecurrenceConfirmCard;
