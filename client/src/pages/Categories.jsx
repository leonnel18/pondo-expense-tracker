import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Circle } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../lib/api';
import EmojiPicker from '../components/ui/EmojiPicker';

const Categories = () => {
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Form states
  const [addForm, setAddForm] = useState({
    name: '',
    type: 'expense',
    color: '#3B82F6',
    icon: '',
    parent_category_id: '' // US-13: '' = None (top-level)
  });

  const [editForm, setEditForm] = useState({
    name: '',
    color: '#3B82F6',
    icon: '',
    parent_category_id: '' // US-13: '' = None (top-level)
  });

  // US-13: top-level categories of a given type, available as parent
  // options — excludes `excludeId` (a category can't be its own parent).
  const getTopLevelOptions = (type, excludeId) => {
    return (categories[type] || []).filter(
      (c) => !c.parent_category_id && c.id !== excludeId
    );
  };

  // US-13: groups a flat, sort_order-ordered category list into
  // top-level categories each followed by their own subcategories
  // (grouped, not flattened as sibling peers) — same client-side
  // grouping pattern used by the entry-time <optgroup> picker.
  const groupCategories = (list) => {
    const topLevel = list.filter((c) => !c.parent_category_id);
    return topLevel.map((parent) => ({
      parent,
      children: list.filter((c) => c.parent_category_id === parent.id)
    }));
  };

  // Shared card renderer for both the top-level and (indented) subcategory
  // cases, used by both the Expense and Income grids below.
  const renderCategoryCard = (category, isChild = false) => (
    <div
      key={category.id}
      className={`flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 ${isChild ? 'ml-6 border-dashed' : ''}`}
    >
      <div className="flex items-center">
        {category.icon && (
          <span className="text-2xl mr-3">{category.icon}</span>
        )}
        <div>
          <div className="flex items-center">
            <Circle
              className="h-4 w-4 mr-2"
              style={{ color: category.color || '#3B82F6' }}
            />
            <span className="font-medium text-gray-900">{category.name}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {category.entry_count ?? 0} entries
          </p>
        </div>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => openEditModal(category)}
          className="p-1 text-gray-500 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded transition-colors duration-150"
          aria-label="Edit category"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleDeleteCategory(category.id)}
          className="p-1 text-gray-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded transition-colors duration-150"
          aria-label="Delete category"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const expenseCategories = await getCategories('expense');
      const incomeCategories = await getCategories('income');
      setCategories({ expense: expenseCategories, income: incomeCategories });
    } catch (err) {
      setError('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      // US-13: '' (None selected) → omit parent_category_id entirely
      // (create with no parent), a positive int → the chosen parent.
      const payload = {
        ...addForm,
        parent_category_id: addForm.parent_category_id
          ? parseInt(addForm.parent_category_id, 10)
          : undefined
      };
      await createCategory(payload);
      setAddForm({ name: '', type: 'expense', color: '#3B82F6', icon: '', parent_category_id: '' });
      setShowAddForm(false);
      setActionError('');
      fetchCategories();
    } catch (err) {
      setActionError(err.message || 'Failed to create category');
    }
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    try {
      // US-13: '' (None selected) → explicit null (promote to top-level),
      // a positive int → attempt to (re)parent. Always sent explicitly
      // since the edit form always reflects the category's current state.
      const payload = {
        ...editForm,
        parent_category_id: editForm.parent_category_id
          ? parseInt(editForm.parent_category_id, 10)
          : null
      };
      await updateCategory(editingCategory.id, payload);
      setShowEditModal(false);
      setEditingCategory(null);
      setEditForm({ name: '', color: '#3B82F6', icon: '', parent_category_id: '' });
      setActionError('');
      fetchCategories();
    } catch (err) {
      setActionError(err.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(id);
        setActionError('');
        fetchCategories();
      } catch (err) {
        setActionError(err.message || 'Failed to delete category');
      }
    }
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setEditForm({
      name: category.name,
      color: category.color || '#3B82F6',
      icon: category.icon || '',
      parent_category_id: category.parent_category_id ? String(category.parent_category_id) : ''
    });
    setShowEditModal(true);
  };

  if (loading) return <div className="p-6">Loading categories...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </button>
      </div>

      {showAddForm && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200">
          <h2 className="text-lg font-semibold mb-4">Add New Category</h2>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={addForm.type}
                  // US-13: a parent must match the category's own type, so
                  // clear any chosen parent when the type changes.
                  onChange={(e) => setAddForm({ ...addForm, type: e.target.value, parent_category_id: '' })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={addForm.color}
                  onChange={(e) => setAddForm({ ...addForm, color: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-1 border"
                />
              </div>
              <div>
                <EmojiPicker
                  selectedEmoji={addForm.icon}
                  onEmojiSelect={(emoji) => setAddForm({ ...addForm, icon: emoji })}
                  label="Emoji (Optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent category (optional)
                </label>
                <select
                  value={addForm.parent_category_id}
                  onChange={(e) => setAddForm({ ...addForm, parent_category_id: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                >
                  <option value="">None</option>
                  {getTopLevelOptions(addForm.type).map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.icon && `${parent.icon} `}
                      {parent.name}
                    </option>
                  ))}
                </select>
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
                Add Category
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Categories</h2>
          {categories.expense.length === 0 ? (
            <div className="text-center p-8 border border-gray-200 rounded-lg">
              <p className="text-gray-500">No expense categories yet</p>
              <button
                onClick={() => {
                  setAddForm({ ...addForm, type: 'expense' });
                  setShowAddForm(true);
                }}
                className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-brand-600 hover:text-brand-700 focus:outline-none transition-colors duration-150"
              >
                Add your first expense category
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {groupCategories(categories.expense).map(({ parent, children }) => (
                <div key={parent.id} className="space-y-2">
                  {renderCategoryCard(parent, false)}
                  {children.map((child) => renderCategoryCard(child, true))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Income Categories</h2>
          {categories.income.length === 0 ? (
            <div className="text-center p-8 border border-gray-200 rounded-lg">
              <p className="text-gray-500">No income categories yet</p>
              <button
                onClick={() => {
                  setAddForm({ ...addForm, type: 'income' });
                  setShowAddForm(true);
                }}
                className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-brand-600 hover:text-brand-700 focus:outline-none transition-colors duration-150"
              >
                Add your first income category
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {groupCategories(categories.income).map(({ parent, children }) => (
                <div key={parent.id} className="space-y-2">
                  {renderCategoryCard(parent, false)}
                  {children.map((child) => renderCategoryCard(child, true))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transition-all duration-200">
            <h2 className="text-lg font-semibold mb-4">Edit Category</h2>
            <form onSubmit={handleEditCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-1 border"
                />
              </div>
              <div>
                <EmojiPicker
                  selectedEmoji={editForm.icon}
                  onEmojiSelect={(emoji) => setEditForm({ ...editForm, icon: emoji })}
                  label="Emoji (Optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent category (optional)
                </label>
                <select
                  value={editForm.parent_category_id}
                  onChange={(e) => setEditForm({ ...editForm, parent_category_id: e.target.value })}
                  disabled={(editingCategory?.child_count ?? 0) > 0}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">None</option>
                  {editingCategory && getTopLevelOptions(editingCategory.type, editingCategory.id).map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.icon && `${parent.icon} `}
                      {parent.name}
                    </option>
                  ))}
                </select>
                {(editingCategory?.child_count ?? 0) > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    This category has its own subcategories and can't be converted into one.
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCategory(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
                >
                  Update Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;