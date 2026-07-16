import React, { useState, useEffect } from 'react';
import { getCategories, getAccounts, createEntry } from '../../lib/api';

const QuickAdd = ({ onEntryAdded }) => {
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category_id: '',
    account_id: '',
    note: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Use individual try/catch per call so one failure doesn't block the others
      const results = await Promise.allSettled([
        getAccounts(),
        getCategories('expense'),
        getCategories('income')
      ]);
      
      const [accountsResult, expenseResult, incomeResult] = results;
      
      if (accountsResult.status === 'fulfilled') {
        setAccounts(accountsResult.value);
        // Set default account if there's only one
        if (accountsResult.value.length === 1) {
          setForm(prev => ({ ...prev, account_id: accountsResult.value[0].id }));
        }
      }
      
      const expenseCategories = expenseResult.status === 'fulfilled' ? expenseResult.value : [];
      const incomeCategories = incomeResult.status === 'fulfilled' ? incomeResult.value : [];
      setCategories({ expense: expenseCategories, income: incomeCategories });
    } catch (err) {
      showMessage('Failed to load data', 'error');
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validate amount
      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }
      
      const entry = await createEntry({
        type: form.type,
        amount: parseFloat(form.amount),
        account_id: parseInt(form.account_id, 10),
        category_id: parseInt(form.category_id, 10),
        note: form.note,
        date: form.date
      });
      
      showMessage('Entry added successfully!', 'success');
      
      // Reset form but keep type, account, and category
      setForm(prev => ({
        ...prev,
        amount: '',
        note: ''
      }));
      
      // Notify parent component
      if (onEntryAdded) {
        onEntryAdded(entry);
      }
    } catch (err) {
      showMessage('Failed to add entry: ' + err.message, 'error');
    } finally {
      setLoading(false);
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Add</h2>
      
      {message.text && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`flex-1 py-2 px-3 rounded-md text-center text-sm font-medium ${
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
            className={`flex-1 py-2 px-3 rounded-md text-center text-sm font-medium ${
              form.type === 'income'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } transition-colors duration-150`}
          >
            Income
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm">₱</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="block w-full pl-6 rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-2 border"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-2 border"
              required
            >
              <option value="">Select category</option>
              {currentCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon && `${category.icon} `}
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Account
            </label>
            <select
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-2 border"
              required
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.emoji && `${account.emoji} `}
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-2 border"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Note
          </label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-2 border"
            placeholder="Add a note (optional)"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all duration-200 active:scale-95"
        >
          {loading ? 'Adding...' : 'Add Entry'}
        </button>
      </form>
    </div>
  );
};

export default QuickAdd;