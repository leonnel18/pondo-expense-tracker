import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Scale } from 'lucide-react';
import { getAccounts, deleteAccount, getAccount, reconcileAccount } from '../lib/api';
import ReconcileModal from '../components/accounts/ReconcileModal';

const Accounts = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reconcilingAccount, setReconcilingAccount] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const accountsData = await getAccounts();
      setAccounts(accountsData);
    } catch (err) {
      setError('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (account) => {
    if (!window.confirm('Are you sure you want to delete this account? The account will be moved to the Recycle Bin and can be restored within 30 days.')) {
      return;
    }
    try {
      await deleteAccount(account.id);
      fetchAccounts();
    } catch (err) {
      setError('Failed to delete account: ' + err.message);
    }
  };

  const handleReconcile = async (accountId, actualBalance) => {
    const result = await reconcileAccount(accountId, actualBalance);
    fetchAccounts();
    return result;
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

  if (loading) return <div className="p-6">Loading accounts...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <button
          onClick={() => navigate('/accounts/add')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center p-12 border border-gray-200 rounded-lg">
          <p className="text-gray-500 mb-4">No accounts yet</p>
          <button
            onClick={() => navigate('/accounts/add')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-brand-600 hover:text-brand-700 focus:outline-none transition-colors duration-150"
          >
            Add your first account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center mb-2">
                    {account.emoji && (
                      <span className="text-2xl mr-2">{account.emoji}</span>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccountTypeColor(account.type)}`}>
                    {getAccountTypeLabel(account.type)}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      // Fetch full account details (including balance) for the modal
                      getAccount(account.id).then((data) => {
                        setReconcilingAccount(data);
                      }).catch(() => {
                        setError('Failed to load account details');
                      });
                    }}
                    className="p-1 text-gray-500 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded transition-colors duration-150"
                    aria-label="Reconcile balance"
                    title="Reconcile balance"
                  >
                    <Scale className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/accounts/${account.id}/edit`)}
                    className="p-1 text-gray-500 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded transition-colors duration-150"
                    aria-label="Edit account"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account)}
                    className="p-1 text-gray-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded transition-colors duration-150"
                    aria-label="Delete account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">{account.description || 'No description'}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Entry count: {account.entry_count ?? 0}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReconcileModal
        isOpen={!!reconcilingAccount}
        onClose={() => setReconcilingAccount(null)}
        account={reconcilingAccount}
        onReconciled={handleReconcile}
      />

    </div>
  );
};

export default Accounts;