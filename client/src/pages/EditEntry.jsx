import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEntry, updateEntry, getCategories, getAccounts } from '../lib/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TagInput from '../components/entries/TagInput';

const EditEntry = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({
    expense: [],
    income: []
  });
  
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    date: '',
    category_id: '',
    account_id: '',
    note: ''
  });
  const [selectedTags, setSelectedTags] = useState([]);

  // Fetch entry details
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [entryData, accountsData, expenseCategories, incomeCategories] = await Promise.all([
          getEntry(id),
          getAccounts(),
          getCategories('expense'),
          getCategories('income')
        ]);
        
        setAccounts(accountsData);
        setCategories({
          expense: expenseCategories,
          income: incomeCategories
        });
        
        // Set form data
        const entry = entryData.entry;
        setFormData({
          type: entry.type,
          amount: entry.amount.toString(),
          date: entry.date,
          category_id: entry.category_id.toString(),
          account_id: entry.account_id.toString(),
          note: entry.note || '',
          pending: entry.pending || false
        });
        setSelectedTags(entry.tags || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({
      ...prev,
      [name]: val
    }));
    
    // If changing type, update category to first of that type
    if (name === 'type') {
      const firstCategory = categories[value]?.[0];
      if (firstCategory) {
        setFormData(prev => ({
          ...prev,
          category_id: firstCategory.id.toString()
        }));
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      // Convert form data to correct types
      const entryData = {
        ...formData,
        amount: parseFloat(formData.amount),
        category_id: parseInt(formData.category_id),
        account_id: parseInt(formData.account_id),
        tag_ids: selectedTags.map(t => t.id)
      };
      
      await updateEntry(id, entryData);
      setSuccess(true);
      
      // Redirect to entries page after a short delay
      setTimeout(() => {
        navigate('/entries');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Get categories for current type
  const currentCategories = categories[formData.type] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/entries')}
            className="text-neutral-500 hover:text-neutral-700 mr-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-neutral-900">Edit Entry</h2>
        </div>
        
        <div className="bg-negativeLight border border-negative rounded-lg p-6">
          <h3 className="text-lg font-medium text-negative">Error loading entry</h3>
          <p className="mt-2 text-negative">{error}</p>
          <Button 
            onClick={() => navigate('/entries')} 
            className="mt-4"
            variant="secondary"
          >
            Back to Entries
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/entries')}
          className="text-neutral-500 hover:text-neutral-700 mr-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-neutral-900">Edit Entry</h2>
      </div>

      {success && (
        <div className="bg-positiveLight border border-positive rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-positive mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-positive font-medium">Entry updated successfully!</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-negativeLight border border-negative rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-negative mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-negative font-medium">{error}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Entry Type Toggle */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleInputChange({ target: { name: 'type', value: 'expense' } })}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    formData.type === 'expense'
                      ? 'bg-brand-600 text-white border-2 border-brand-600'
                      : 'bg-brand-50 text-brand-600 border-2 border-brand-100'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <span className="mr-2">↓</span>
                    Expense
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange({ target: { name: 'type', value: 'income' } })}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    formData.type === 'income'
                      ? 'bg-brand-600 text-white border-2 border-brand-600'
                      : 'bg-brand-50 text-brand-600 border-2 border-brand-100'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <span className="mr-2">↑</span>
                    Income
                  </div>
                </button>
              </div>
            </div>

            {/* Amount */}
            <Input
              label="Amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              prefix="₱"
              value={formData.amount}
              onChange={handleInputChange}
              required
            />

            {/* Date */}
            <Input
              label="Date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />

            {/* Category */}
            <Select
              label="Category"
              name="category_id"
              value={formData.category_id}
              onChange={handleInputChange}
              required
            >
              <option value="">Select a category</option>
              {currentCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            {/* Account */}
            <Select
              label="Account"
              name="account_id"
              value={formData.account_id}
              onChange={handleInputChange}
              required
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </Select>

            {/* Note */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Note (optional)</label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={3}
                className="block w-full px-4 py-2.5 border border-neutral-200 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 transition-colors"
                placeholder="Add a note about this entry..."
              />
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <TagInput value={selectedTags} onChange={setSelectedTags} />
            </div>

            {/* Pending checkbox (US-04) */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="pending"
                  checked={formData.pending || false}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-neutral-200 rounded"
                />
                <span className="text-sm text-neutral-700">Mark as pending</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/entries')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={saving}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEntry;