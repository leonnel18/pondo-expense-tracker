import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, ArrowRightLeft, Trash2 } from 'lucide-react';
import { getTransfer, updateTransfer, deleteTransfer, getAccounts } from '../lib/api';

const EditTransfer = () => {
  const navigate = useNavigate();
  const { transferGroupId } = useParams();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    note: '',
    date: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, [transferGroupId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transferData, accountsData] = await Promise.all([
        getTransfer(transferGroupId),
        getAccounts()
      ]);
      
      setAccounts(accountsData);
      
      // Set form data from transfer
      const transfer = transferData.transfer;
      const fromEntry = transfer.from_entry;
      const toEntry = transfer.to_entry;
      
      setForm({
        from_account_id: fromEntry.account_id.toString(),
        to_account_id: toEntry.account_id.toString(),
        amount: fromEntry.amount.toString(),
        note: fromEntry.note || '',
        date: fromEntry.date
      });
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate form
      if (form.from_account_id === form.to_account_id) {
        throw new Error('From and To accounts must be different');
      }
      
      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }
      
      const today = new Date().toISOString().split('T')[0];
      if (form.date > today) {
        throw new Error('Date cannot be in the future');
      }
      
      await updateTransfer(transferGroupId, {
        from_account_id: parseInt(form.from_account_id, 10),
        to_account_id: parseInt(form.to_account_id, 10),
        amount: parseFloat(form.amount),
        note: form.note,
        date: form.date
      });
      
      setSuccess('Transfer updated successfully!');
      
      // Redirect to entries page after a short delay
      setTimeout(() => {
        navigate('/entries');
      }, 1500);
    } catch (err) {
      setError('Failed to update transfer: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this transfer? This action cannot be undone.')) {
      return;
    }
    
    setDeleting(true);
    setError('');
    
    try {
      await deleteTransfer(transferGroupId);
      alert('Transfer deleted successfully!');
      navigate('/entries');
    } catch (err) {
      setError('Failed to delete transfer: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Get accounts for "To" dropdown, excluding the selected "From" account
  const toAccounts = accounts.filter(account => account.id !== form.from_account_id);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/entries')}
          className="inline-flex items-center text-brand-600 hover:text-brand-700 transition-colors duration-150"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Entries
        </button>
      </div>
      
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Transfer</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Account
                  </label>
                  <select
                    value={form.from_account_id}
                    onChange={(e) => setForm({ ...form, from_account_id: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                    required
                  >
                    <option value="">Select an account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.emoji && `${account.emoji} `}
                        {account.name} ({account.type})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end justify-center">
                  <ArrowRightLeft className="h-6 w-6 text-gray-400" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Account
                  </label>
                  <select
                    value={form.to_account_id}
                    onChange={(e) => setForm({ ...form, to_account_id: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                    required
                  >
                    <option value="">Select an account</option>
                    {toAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.emoji && `${account.emoji} `}
                        {account.name} ({account.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₱</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="block w-full pl-8 rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  placeholder="Add a note (optional)"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors duration-150"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete Transfer'}
            </button>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => navigate('/entries')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors duration-150"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTransfer;