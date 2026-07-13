import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createAccount } from '../lib/api';
import EmojiPicker from '../components/ui/EmojiPicker';

const AddAccount = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    type: 'debit',
    description: '',
    emoji: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await createAccount(form);
      navigate('/accounts');
    } catch (err) {
      setError('Failed to create account: ' + err.message);
    } finally {
      setLoading(false);
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/accounts')}
          className="inline-flex items-center text-brand-600 hover:text-brand-700 transition-colors duration-150"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Accounts
        </button>
      </div>
      
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Account</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                  <option value="lent">Lent</option>
                  <option value="borrowed">Borrowed</option>
                  <option value="invest">Investment</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  {getAccountTypeLabel(form.type)} accounts track {form.type === 'invest' ? 'investment gains' : form.type === 'lent' ? 'money you\'ve lent' : form.type === 'borrowed' ? 'money you\'ve borrowed' : 'regular spending'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                />
              </div>
              
              <div>
                <EmojiPicker
                  selectedEmoji={form.emoji}
                  onEmojiSelect={(emoji) => setForm({ ...form, emoji })}
                  label="Account Emoji (Optional)"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/accounts')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors duration-150"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccount;