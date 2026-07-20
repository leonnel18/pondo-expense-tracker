import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Archive, RotateCcw } from 'lucide-react';
import {
  getRecurrences, createRecurrence, updateRecurrence, deleteRecurrence,
  archiveRecurrence, restoreRecurrence, getAccounts, getCategories
} from '../lib/api';
import { usePrivacy } from '../contexts/PrivacyContext';
import { MASK_PLACEHOLDER } from '../lib/mask';

const formatCurrency = (amount, masked) => {
  if (masked) return MASK_PLACEHOLDER;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getCycleLabel = (cycle) => cycle.charAt(0).toUpperCase() + cycle.slice(1);
const getModeLabel = (mode) => mode.charAt(0).toUpperCase() + mode.slice(1);

const emptyForm = {
  account_id: '',
  category_id: '',
  type: 'expense',
  amount: '',
  note: '',
  mode: 'repeat',
  cycle: 'monthly',
  start_date: '',
  end_date: '',
  occurrences_total: '',
  auto_post: true,
};

const Recurrences = () => {
  const { masked } = usePrivacy();
  const [recurrences, setRecurrences] = useState([]);
  const [archived, setArchived] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecurrence, setEditingRecurrence] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const [addForm, setAddForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [active, archivedList, accts, expenseCats, incomeCats] = await Promise.all([
        getRecurrences(),
        getRecurrences(true),
        getAccounts(),
        getCategories('expense'),
        getCategories('income'),
      ]);
      setRecurrences(active);
      setArchived(archivedList);
      setAccounts(accts);
      // Categories offered depend on the selected type (expense/income),
      // same filtering idea as Budgets.jsx but recurrences support both.
      setCategories({ expense: expenseCats, income: incomeCats });
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const categoriesForType = (type, cats) => (cats && cats[type]) || [];

  const buildPayload = (form) => {
    const payload = {
      account_id: Number(form.account_id),
      category_id: Number(form.category_id),
      type: form.type,
      amount: Number(form.amount),
      note: form.note || undefined,
      mode: form.mode,
      cycle: form.cycle,
      start_date: form.start_date,
      auto_post: form.auto_post,
    };
    if (form.mode === 'installment') {
      payload.occurrences_total = Number(form.occurrences_total);
    }
    if (form.mode === 'subscription' && form.end_date) {
      payload.end_date = form.end_date;
    }
    return payload;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await createRecurrence(buildPayload(addForm));
      setAddForm(emptyForm);
      setShowAddForm(false);
      setActionError('');
      fetchData();
    } catch (err) {
      setActionError(err.message || 'Failed to create recurrence');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = buildPayload(editForm);
      if (editForm.mode !== 'subscription') {
        payload.end_date = null;
      }
      await updateRecurrence(editingRecurrence.id, payload);
      setShowEditModal(false);
      setEditingRecurrence(null);
      setEditForm(emptyForm);
      setActionError('');
      fetchData();
    } catch (err) {
      setActionError(err.message || 'Failed to update recurrence');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this recurrence permanently? This is only possible if it has no posted entries — otherwise archive it instead.')) {
      try {
        await deleteRecurrence(id);
        setActionError('');
        fetchData();
      } catch (err) {
        setActionError(err.message || 'Failed to delete recurrence');
      }
    }
  };

  const handleArchive = async (id) => {
    try {
      await archiveRecurrence(id);
      setActionError('');
      fetchData();
    } catch (err) {
      setActionError(err.message || 'Failed to archive recurrence');
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreRecurrence(id);
      setActionError('');
      fetchData();
    } catch (err) {
      setActionError(err.message || 'Failed to restore recurrence');
    }
  };

  const openEditModal = (r) => {
    setEditingRecurrence(r);
    setEditForm({
      account_id: String(r.account_id),
      category_id: String(r.category_id),
      type: r.type,
      amount: String(r.amount),
      note: r.note || '',
      mode: r.mode,
      cycle: r.cycle,
      start_date: r.start_date || '',
      end_date: r.end_date || '',
      occurrences_total: r.occurrences_total ? String(r.occurrences_total) : '',
      auto_post: r.auto_post,
    });
    setShowEditModal(true);
  };

  if (loading) return <div className="p-6">Loading recurrences...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  const renderForm = (form, setForm, onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value, category_id: '' })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
            required
          >
            <option value="">Select a category</option>
            {categoriesForType(form.type, categories).map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon ? cat.icon + ' ' : ''}{cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
          <select
            value={form.account_id}
            onChange={(e) => setForm({ ...form, account_id: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
            required
          >
            <option value="">Select an account</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.emoji ? acc.emoji + ' ' : ''}{acc.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
          <select
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
          >
            <option value="repeat">Repeat</option>
            <option value="installment">Installment</option>
            <option value="subscription">Subscription</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cycle</label>
          <select
            value={form.cycle}
            onChange={(e) => setForm({ ...form, cycle: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
            required
          />
        </div>
        {form.mode === 'installment' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Payments
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={form.occurrences_total}
              onChange={(e) => setForm({ ...form, occurrences_total: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
              required
            />
          </div>
        )}
        {form.mode === 'subscription' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date (optional)
            </label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
            />
          </div>
        )}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
          />
        </div>
        <div className="flex items-center md:col-span-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_post}
              onChange={(e) => setForm({ ...form, auto_post: e.target.checked })}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Post automatically (uncheck to confirm each occurrence yourself)</span>
          </label>
        </div>
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            setShowAddForm(false);
            setShowEditModal(false);
            setEditingRecurrence(null);
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );

  const renderRow = (r, isArchived) => (
    <div
      key={r.id}
      className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center min-w-0">
        {r.category_icon && (
          <span className="text-2xl mr-3 flex-shrink-0">{r.category_icon}</span>
        )}
        <div className="min-w-0">
          <span className="font-medium text-gray-900 block truncate">{r.category_name}</span>
          <p className="text-sm text-gray-500 mt-1">
            {formatCurrency(r.amount, masked)} · {getModeLabel(r.mode)} · {getCycleLabel(r.cycle)}
          </p>
          <p className="text-xs text-gray-400">
            {r.mode === 'installment'
              ? `${r.occurrences_completed} of ${r.occurrences_total} payments`
              : `Next due ${formatDate(r.next_due_date)}`}
          </p>
        </div>
      </div>
      <div className="flex space-x-2 flex-shrink-0 ml-2">
        {isArchived ? (
          <button
            onClick={() => handleRestore(r.id)}
            className="p-1 text-gray-500 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded transition-colors duration-150"
            aria-label="Restore recurrence"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        ) : (
          <>
            <button
              onClick={() => openEditModal(r)}
              className="p-1 text-gray-500 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded transition-colors duration-150"
              aria-label="Edit recurrence"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleArchive(r.id)}
              className="p-1 text-gray-500 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded transition-colors duration-150"
              aria-label="Archive recurrence"
            >
              <Archive className="h-4 w-4" />
            </button>
          </>
        )}
        <button
          onClick={() => handleDelete(r.id)}
          className="p-1 text-gray-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded transition-colors duration-150"
          aria-label="Delete recurrence"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recurring</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Recurring
        </button>
      </div>

      {showAddForm && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200">
          <h2 className="text-lg font-semibold mb-4">Add New Recurring Item</h2>
          {renderForm(addForm, setAddForm, handleAdd, 'Add Recurring')}
        </div>
      )}

      {recurrences.length === 0 ? (
        <div className="text-center p-8 border border-gray-200 rounded-lg">
          <p className="text-gray-500">No recurring items yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-brand-600 hover:text-brand-700 focus:outline-none transition-colors duration-150"
          >
            Add your first recurring item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurrences.map((r) => renderRow(r, false))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-150"
          >
            {showArchived ? 'Hide' : 'Show'} Archived ({archived.length})
          </button>
          {showArchived && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {archived.map((r) => renderRow(r, true))}
            </div>
          )}
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transition-all duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Edit Recurring Item</h2>
            {renderForm(editForm, setEditForm, handleEdit, 'Update Recurring')}
          </div>
        </div>
      )}
    </div>
  );
};

export default Recurrences;
