import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { getAccounts, getCategories, createEntry } from '../lib/api';

const AddEntry = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    account_id: '',
    category_id: '',
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
      const [accountsData, expenseCategories, incomeCategories] = await Promise.all([
        getAccounts(),
        getCategories('expense'),
        getCategories('income')
      ]);
      
      setAccounts(accountsData);
      setCategories({ expense: expenseCategories, income: incomeCategories });
      
      // Set default account if there's only one
      if (accountsData.length === 1) {
        setForm(prev => ({ ...prev, account_id: accountsData[0].id }));
      }
      
      // Set default category if there's only one in the selected type
      if (form.type === 'expense' && expenseCategories.length === 1) {
        setForm(prev => ({ ...prev, category_id: expenseCategories[0].id }));
      } else if (form.type === 'income' && incomeCategories.length === 1) {
        setForm(prev => ({ ...prev, category_id: incomeCategories[0].id }));
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
      // Validate amount
      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }
      
      await createEntry({
        type: form.type,
        amount: parseFloat(form.amount),
        account_id: parseInt(form.account_id, 10),
        category_id: parseInt(form.category_id, 10),
        note: form.note,
        date: form.date
      });
      
      // Reset form but keep type and date
      setForm(prev => ({
        ...prev,
        amount: '',
        account_id: '',
        category_id: '',
        note: ''
      }));
      
      alert('Entry added successfully!');
    } catch (err) {
      setError('Failed to create entry: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (type) => {
    setForm(prev => ({
      ...prev,
      type,
      category_id: '' // Reset category when type changes
    }));
  };

  // Get categories for the current type
  const currentCategories = form.type === 'expense' ? categories.expense : categories.income;

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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Entry</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  className={`flex-1 py-2 px-4 rounded-md text-center font-medium ${
                    form.type === 'expense'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } transition-colors duration-150`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={`flex-1 py-2 px-4 rounded-md text-center font-medium ${
                    form.type === 'income'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } transition-colors duration-150`}
                >
                  Income
                </button>
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
                  Account
                </label>
                <select
                  value={form.account_id}
                  onChange={(e) => setForm({ ...form, account_id: e.target.value })}
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  required
                >
                  <option value="">Select a category</option>
                  {currentCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon && `${category.icon} `}
                      {category.name}
                    </option>
                  ))}
                </select>
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
              {saving ? 'Adding...' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEntry;