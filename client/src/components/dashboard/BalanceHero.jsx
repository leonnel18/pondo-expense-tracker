import React from 'react';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { useColorConvention } from '../../contexts/ColorConventionContext';
import { MASK_PLACEHOLDER } from '../../lib/mask';
import { flowTextClass300 } from '../../lib/colorConvention';

const BalanceHero = ({ kpi }) => {
  const { masked } = usePrivacy();
  const { swapped } = useColorConvention();

  // Format currency — coerce null/undefined/NaN to 0 to avoid "₱NaN"
  const formatCurrency = (amount) => {
    if (masked) return MASK_PLACEHOLDER;
    const safe = (amount == null || Number.isNaN(amount)) ? 0 : amount;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(safe);
  };

  return (
    <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-lg shadow-sm p-6 text-white transition-all duration-200">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-medium text-brand-100">Net Worth</h2>
          <p className="text-3xl font-bold mt-2">{formatCurrency(kpi.total_balance)}</p>
          <p className="text-brand-100 mt-1">Across all accounts</p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end">
            <span className="text-sm font-medium mr-2">This period:</span>
            <span className={`text-sm font-bold ${flowTextClass300(swapped, kpi.net_balance >= 0)}`}>
              {masked ? formatCurrency(kpi.net_balance) : `${kpi.net_balance >= 0 ? '+' : ''}${formatCurrency(kpi.net_balance)}`}
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-brand-500 bg-opacity-20 rounded-lg p-3">
          <p className="text-brand-100 text-sm">Total Income</p>
          <p className={`font-bold text-lg ${flowTextClass300(swapped, true)}`}>{formatCurrency(kpi.total_income)}</p>
        </div>
        <div className="bg-brand-500 bg-opacity-20 rounded-lg p-3">
          <p className="text-brand-100 text-sm">Total Expenses</p>
          <p className={`font-bold text-lg ${flowTextClass300(swapped, false)}`}>{formatCurrency(kpi.total_expenses)}</p>
        </div>
        <div className="bg-brand-500 bg-opacity-20 rounded-lg p-3">
          <p className="text-brand-100 text-sm">Net Balance</p>
          <p className={`font-bold text-lg ${flowTextClass300(swapped, kpi.net_balance >= 0)}`}>
            {masked ? formatCurrency(kpi.net_balance) : `${kpi.net_balance >= 0 ? '+' : ''}${formatCurrency(kpi.net_balance)}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BalanceHero;