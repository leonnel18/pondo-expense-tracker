import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardBudgets } from '../../lib/api';
import BudgetProgressBar from './BudgetProgressBar';

const BudgetCard = () => {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const data = await getDashboardBudgets();
      // Only show active budgets on the dashboard
      setBudgets((data || []).filter(b => b.active));
    } catch {
      // Silently fail — budgets are optional on the dashboard
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-200">
        <div className="p-4 text-sm text-gray-500">Loading budgets...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Budgets</h2>
        <button
          onClick={() => navigate('/budgets')}
          className="text-sm text-brand-600 hover:text-brand-700 transition-colors duration-150"
        >
          View all
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="text-center p-8 border border-gray-200 rounded-lg">
          <p className="text-gray-500">No budgets yet</p>
          <button
            onClick={() => navigate('/budgets')}
            className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-brand-600 hover:text-brand-700 focus:outline-none transition-colors duration-150"
          >
            Set up a budget
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map((budget) => (
            <BudgetProgressBar
              key={budget.budget_id}
              category_name={budget.category_name}
              category_color={budget.category_color}
              category_icon={budget.category_icon}
              amount={budget.amount}
              spend={budget.spend}
              percent={budget.percent}
              remaining={budget.remaining}
              cycle={budget.cycle}
              current_cycle_start={budget.current_cycle_start}
              current_cycle_end={budget.current_cycle_end}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BudgetCard;
