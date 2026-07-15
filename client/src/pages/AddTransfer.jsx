import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ArrowRightLeft } from 'lucide-react';
import { getAccounts, createTransfer } from '../lib/api';

const AddTransfer = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    note: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const accountsData = await getAccounts();
      setAccounts(accountsData);
      
      // Set default accounts if there are at least two
      if (accountsData.length >= 2) {
        setForm(prev => ({
          ...prev,
          from_account_id: accountsData[0].id,
          to_account_id: accountsData[1].id
        }));
      }
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
      
      await createTransfer({
        from_account_id: parseInt(form.from_account_id, 10),
        to_account_id: parseInt(form.to_account_id, 10),
        amount: parseFloat(form.amount),
        note: form.note,
        date: form.date
      });
      
      alert('Transfer created successfully!');
      navigate('/entries');
    } catch (err) {
      setError('Failed to create transfer: ' + err.message);
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Transfer</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
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
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors duration-150"
            >
              <Plus className="h-4 w-4 mr-2" />
              {saving ? 'Creating...' : 'Create Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransfer;