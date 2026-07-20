import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { MASK_PLACEHOLDER } from '../../lib/mask';

const AccountSummary = ({ accounts }) => {
  const navigate = useNavigate();
  const { masked } = usePrivacy();
  const formatCurrency = (amount) => {
    if (masked) return MASK_PLACEHOLDER;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const getAccountTypeLabel = (type) => {
    switch (type) {
      case 'debit': return 'Debit';
      case 'credit': return 'Credit';
      case 'lent': return 'Lent';
      case 'borrowed': return 'Borrowed';
      case 'invest': return 'Investment';
      default: return type;
    }
  };

  const getAccountTypeColor = (type) => {
    switch (type) {
      case 'debit': return 'bg-blue-100 text-blue-800';
      case 'credit': return 'bg-purple-100 text-purple-800';
      case 'lent': return 'bg-green-100 text-green-800';
      case 'borrowed': return 'bg-yellow-100 text-yellow-800';
      case 'invest': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!accounts || accounts.length === 0) {
    return (
      <div className="text-center p-8 border border-gray-200 rounded-lg">
        <p className="text-gray-500">No accounts yet</p>
        <button
          onClick={() => navigate('/accounts/add')}
          className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-brand-600 hover:text-brand-700 focus:outline-none transition-colors duration-150"
        >
          Add your first account
        </button>
      </div>
    );
  }

  // Sort accounts by balance (highest first)
  const sortedAccounts = [...accounts].sort((a, b) => b.balance - a.balance);

  return (
    <div className="space-y-4">
      {sortedAccounts.map((account) => (
        <div
          key={account.id}
          className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center">
            {account.emoji && (
              <span className="text-2xl mr-3">{account.emoji}</span>
            )}
            <div>
              <div className="flex items-center">
                {account.emoji && (
                  <span className="text-lg mr-2">{account.emoji}</span>
                )}
                <h3 className="text-sm font-medium text-gray-900">{account.name}</h3>
              </div>
              <div className="flex items-center mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getAccountTypeColor(account.type)}`}>
                  {getAccountTypeLabel(account.type)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${
              account.balance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(account.balance)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccountSummary;