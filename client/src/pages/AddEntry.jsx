import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { getAccounts, getCategories, createEntry } from '../lib/api';
import { evaluateAmountExpression } from '../lib/amountExpression';
import TagInput from '../components/entries/TagInput';

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
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
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
      // Resolve arithmetic expressions (e.g. "250+150") before validating (US-42).
      // Falls back to the plain parseFloat/isNaN check below when unparseable.
      const evaluatedAmount = evaluateAmountExpression(form.amount);
      const amount = evaluatedAmount !== null ? evaluatedAmount : parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      await createEntry({
        type: form.type,
        amount,
        account_id: parseInt(form.account_id, 10),
        category_id: parseInt(form.category_id, 10),
        note: form.note,
        date: form.date,
        tag_ids: selectedTags.map(t => t.id)
      });
      
      // Reset form but keep type and date
      setForm(prev => ({
        ...prev,
        amount: '',
        account_id: '',
        category_id: '',
        note: ''
      }));
      setSelectedTags([]);
      
      alert('Entry added successfully!');
    } catch (err) {
      setError('Failed to create entry: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Resolve the raw typed text into a computed number on blur (US-42), so
  // the field displays "400" after a user types "250+150" and tabs/clicks
  // away, while the raw expression stays visible while focused. Invalid/
  // unparseable text is left as-is for handleSubmit's fallback validation.
  const handleAmountBlur = () => {
    const evaluated = evaluateAmountExpression(form.amount);
    if (evaluated !== null) {
      setForm((prev) => ({ ...prev, amount: String(evaluated) }));
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

  // US-13: build the two-level <optgroup> picker client-side from the
  // same flat getCategories(type) response already fetched above — no
  // new API call. Top-level categories render as their own <option> (an
  // entry can still be logged directly against a parent, no subcategory);
  // each top-level category with child_count > 0 is immediately followed
  // by an <optgroup> of its subcategories.
  const topLevelCategories = currentCategories.filter((c) => !c.parent_category_id);
  const subcategoriesByParent = currentCategories.reduce((acc, c) => {
    if (c.parent_category_id) {
      (acc[c.parent_category_id] = acc[c.parent_category_id] || []).push(c);
    }
    return acc;
  }, {});

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
                    type="text"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    onBlur={handleAmountBlur}
                    placeholder="0.00 or 250+150"
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
                  {topLevelCategories.map((category) => (
                    <React.Fragment key={category.id}>
                      <option value={category.id}>
                        {category.icon && `${category.icon} `}
                        {category.name}
                      </option>
                      {category.child_count > 0 && (
                        <optgroup label={category.name}>
                          {(subcategoriesByParent[category.id] || []).map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.icon && `${sub.icon} `}
                              {sub.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </React.Fragment>
                  ))}
                </select>
              </div>
              
              <TagInput value={selectedTags} onChange={setSelectedTags} />
              
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