import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

const FilterPanel = ({ 
  filters, 
  onFilterChange, 
  onSearch, 
  accounts, 
  categories, 
  showTypeFilter = true, 
  showDateFilters = true, 
  showSearch = true 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleSearchChange = (e) => {
    onSearch(e.target.value);
  };

  const handleApplyFilters = () => {
    // Filters are applied automatically when inputs change
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      type: '',
      category_id: '',
      account_id: '',
      min_amount: '',
      max_amount: '',
      from: '',
      to: '',
      search: ''
    };
    onFilterChange(clearedFilters);
    onSearch('');
  };

  // Combine expense and income categories for the filter dropdown
  const allCategories = [...(categories.expense || []), ...(categories.income || [])];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-lg"
      >
        <span className="text-sm font-medium text-gray-900">Filters</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 pt-4">
          {showSearch && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Notes
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={handleSearchChange}
                  placeholder="Search entries..."
                  className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                />
              </div>
            </div>
          )}

          {showTypeFilter && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                >
                  <option value="">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={filters.category_id || ''}
                  onChange={(e) => handleInputChange('category_id', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                >
                  <option value="">All Categories</option>
                  {allCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon && `${category.icon} `}
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account
            </label>
            <select
              value={filters.account_id || ''}
              onChange={(e) => handleInputChange('account_id', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
            >
              <option value="">All Accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.emoji && `${account.emoji} `}
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={filters.min_amount || ''}
                onChange={(e) => handleInputChange('min_amount', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={filters.max_amount || ''}
                onChange={(e) => handleInputChange('max_amount', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                placeholder="0.00"
              />
            </div>
          </div>

          {showDateFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.from || ''}
                  onChange={(e) => handleInputChange('from', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.to || ''}
                  onChange={(e) => handleInputChange('to', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
            >
              Clear
            </button>
            <button
              onClick={handleApplyFilters}
              className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;