import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getAccounts, deleteAccount } from '../lib/api';

const Accounts = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolveModal, setResolveModal] = useState(null); // { account, entryCount, resolution, targetAccountId }

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
    if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteAccount(account.id);
      fetchAccounts();
    } catch (err) {
      if (err.message && err.message.includes('entr')) {
        // Account has existing entries — ask how to resolve them
        setResolveModal({ account, resolution: 'reassign', targetAccountId: '' });
      } else {
        setError('Failed to delete account: ' + err.message);
      }
    }
  };

  const handleResolveDelete = async () => {
    if (!resolveModal) return;
    try {
      const resolution = resolveModal.resolution === 'reassign'
        ? { resolution: 'reassign', target_account_id: Number(resolveModal.targetAccountId) }
        : { resolution: 'cascade' };

      if (resolution.resolution === 'reassign' && !resolution.target_account_id) {
        setError('Please choose a target account to reassign entries to.');
        return;
      }

      await deleteAccount(resolveModal.account.id, resolution);
      setResolveModal(null);
      fetchAccounts();
    } catch (err) {
      setError('Failed to delete account: ' + err.message);
    }
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

      {resolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-2">Delete "{resolveModal.account.name}"</h2>
            <p className="text-sm text-gray-600 mb-4">
              This account still has entries. Choose what to do with them before deleting it.
            </p>

            <div className="space-y-3 mb-4">
              <label className="flex items-start space-x-2">
                <input
                  type="radio"
                  name="resolution"
                  checked={resolveModal.resolution === 'reassign'}
                  onChange={() => setResolveModal({ ...resolveModal, resolution: 'reassign' })}
                  className="mt-1"
                />
                <span className="text-sm text-gray-700">Reassign entries to another account</span>
              </label>
              {resolveModal.resolution === 'reassign' && (
                <select
                  value={resolveModal.targetAccountId}
                  onChange={(e) => setResolveModal({ ...resolveModal, targetAccountId: e.target.value })}
                  className="block w-full ml-6 rounded-md border-gray-300 shadow-sm text-sm p-2 border"
                >
                  <option value="">Select target account</option>
                  {accounts.filter(a => a.id !== resolveModal.account.id).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                  ))}
                </select>
              )}

              <label className="flex items-start space-x-2">
                <input
                  type="radio"
                  name="resolution"
                  checked={resolveModal.resolution === 'cascade'}
                  onChange={() => setResolveModal({ ...resolveModal, resolution: 'cascade' })}
                  className="mt-1"
                />
                <span className="text-sm text-gray-700">Delete all entries in this account</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setResolveModal(null)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveDelete}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;