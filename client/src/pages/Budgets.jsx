import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../lib/api';
import { getCategories } from '../lib/api';

const formatCurrency = (amount) => {
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

const getCycleLabel = (cycle) => {
  return cycle.charAt(0).toUpperCase() + cycle.slice(1);
};

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const [addForm, setAddForm] = useState({
    category_id: '',
    amount: '',
    cycle: 'monthly',
    cycle_start: '',
    cycle_end: '',
    reuse_next: false
  });

  const [editForm, setEditForm] = useState({
    category_id: '',
    amount: '',
    cycle: 'monthly',
    cycle_start: '',
    cycle_end: '',
    reuse_next: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [budgetsData, expenseCats, incomeCats] = await Promise.all([
        getBudgets(),
        getCategories('expense'),
        getCategories('income')
      ]);
      setBudgets(budgetsData);
      // Only expense categories are budgetable
      setCategories(expenseCats);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        category_id: Number(addForm.category_id),
        amount: Number(addForm.amount),
        cycle: addForm.cycle,
        cycle_start: addForm.cycle_start,
        reuse_next: addForm.reuse_next
      };
      if (addForm.cycle === 'custom') {
        payload.cycle_end = addForm.cycle_end;
      }
      await createBudget(payload);
      setAddForm({
        category_id: '',
        amount: '',
        cycle: 'monthly',
        cycle_start: '',
        cycle_end: '',
        reuse_next: false
      });
      setShowAddForm(false);
      setActionError('');
      fetchData();
    } catch (err) {
      setActionError(err.message || 'Failed to create budget');
    }
  };

  const handleEditBudget = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        category_id: Number(editForm.category_id),
        amount: Number(editForm.amount),
        cycle: editForm.cycle,
        cycle_start: editForm.cycle_start,
        reuse_next: editForm.reuse_next
      };
      if (editForm.cycle === 'custom') {
        payload.cycle_end = editForm.cycle_end;
      } else {
        // Explicitly null out cycle_end when switching away from custom
        payload.cycle_end = null;
      }
      await updateBudget(editingBudget.id, payload);
      setShowEditModal(false);
      setEditingBudget(null);
      setEditForm({
        category_id: '',
        amount: '',
        cycle: 'monthly',
        cycle_start: '',
        cycle_end: '',
        reuse_next: false
      });
      setActionError('');
      fetchData();
    } catch (err) {
      setActionError(err.message || 'Failed to update budget');
    }
  };

  const handleDeleteBudget = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await deleteBudget(id);
        setActionError('');
        fetchData();
      } catch (err) {
        setActionError(err.message || 'Failed to delete budget');
      }
    }
  };

  const openEditModal = (budget) => {
    setEditingBudget(budget);
    setEditForm({
      category_id: String(budget.category_id),
      amount: String(budget.amount),
      cycle: budget.cycle,
      cycle_start: budget.cycle_start || '',
      cycle_end: budget.cycle_end || '',
      reuse_next: budget.reuse_next || false
    });
    setShowEditModal(true);
  };

  if (loading) return <div className="p-6">Loading budgets...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </button>
      </div>

      {showAddForm && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200">
          <h2 className="text-lg font-semibold mb-4">Add New Budget</h2>
          <form onSubmit={handleAddBudget} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={addForm.category_id}
                  onChange={(e) => setAddForm({ ...addForm, category_id: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon ? cat.icon + ' ' : ''}{cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addForm.amount}
                  onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cycle
                </label>
                <select
                  value={addForm.cycle}
                  onChange={(e) => setAddForm({ ...addForm, cycle: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cycle Start
                </label>
                <input
                  type="date"
                  value={addForm.cycle_start}
                  onChange={(e) => setAddForm({ ...addForm, cycle_start: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  required
                />
              </div>
              {addForm.cycle === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cycle End
                  </label>
                  <input
                    type="date"
                    value={addForm.cycle_end}
                    onChange={(e) => setAddForm({ ...addForm, cycle_end: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                    required
                  />
                </div>
              )}
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.reuse_next}
                    onChange={(e) => setAddForm({ ...addForm, reuse_next: e.target.checked })}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Roll over to next cycle automatically</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
              >
                Add Budget
              </button>
            </div>
          </form>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="text-center p-8 border border-gray-200 rounded-lg">
          <p className="text-gray-500">No budgets yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-brand-600 hover:text-brand-700 focus:outline-none transition-colors duration-150"
          >
            Add your first budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => (
            <div
              key={budget.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center min-w-0">
                {budget.category_icon && (
                  <span className="text-2xl mr-3 flex-shrink-0">{budget.category_icon}</span>
                )}
                <div className="min-w-0">
                  <span className="font-medium text-gray-900 block truncate">{budget.category_name}</span>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatCurrency(budget.amount)} · {getCycleLabel(budget.cycle)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(budget.cycle_start)}
                    {budget.cycle_end ? ` – ${formatDate(budget.cycle_end)}` : ' onward'}
                  </p>
                  {budget.reuse_next && (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Auto-rollover
                    </span>
                  )}
                </div>
              </div>
              <div className="flex space-x-2 flex-shrink-0 ml-2">
                <button
                  onClick={() => openEditModal(budget)}
                  className="p-1 text-gray-500 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded transition-colors duration-150"
                  aria-label="Edit budget"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteBudget(budget.id)}
                  className="p-1 text-gray-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded transition-colors duration-150"
                  aria-label="Delete budget"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transition-all duration-200">
            <h2 className="text-lg font-semibold mb-4">Edit Budget</h2>
            <form onSubmit={handleEditBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={editForm.category_id}
                  onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon ? cat.icon + ' ' : ''}{cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cycle
                </label>
                <select
                  value={editForm.cycle}
                  onChange={(e) => setEditForm({ ...editForm, cycle: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cycle Start
                </label>
                <input
                  type="date"
                  value={editForm.cycle_start}
                  onChange={(e) => setEditForm({ ...editForm, cycle_start: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  required
                />
              </div>
              {editForm.cycle === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cycle End
                  </label>
                  <input
                    type="date"
                    value={editForm.cycle_end}
                    onChange={(e) => setEditForm({ ...editForm, cycle_end: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                    required
                  />
                </div>
              )}
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.reuse_next}
                    onChange={(e) => setEditForm({ ...editForm, reuse_next: e.target.checked })}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Roll over to next cycle automatically</span>
                </label>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBudget(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
                >
                  Update Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
