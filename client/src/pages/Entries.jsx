import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Download, List, Calendar, CheckCircle } from 'lucide-react';
import { getEntries, getAccounts, getCategories, deleteEntry, exportEntries, confirmPendingEntry } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useAddEntryModal } from '../contexts/AddEntryModalContext';
import { MASK_PLACEHOLDER } from '../lib/mask';
import FilterPanel from '../components/dashboard/FilterPanel';
import CalendarView from '../components/entries/CalendarView';

const Entries = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // refetch when auth state changes
  const { masked } = usePrivacy();
  const { openAddEntryModal } = useAddEntryModal();
  const [exporting, setExporting] = useState(false);
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true); // first load only — full-page spinner
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    category_id: '',
    account_id: '',
    min_amount: '',
    max_amount: '',
    from: '',
    to: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);

  // Add Entry modal state — modal now lives in AddEntryModalContext (US-07)
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar' — local only, not persisted

  useEffect(() => {
    fetchData();
    fetchFilters();
  }, [user]); // refetch when auth state changes

  useEffect(() => {
    fetchEntries();
  }, [filters, pagination.page]);

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
      }
      
      const expenseCategories = expenseResult.status === 'fulfilled' ? expenseResult.value : [];
      const incomeCategories = incomeResult.status === 'fulfilled' ? incomeResult.value : [];
      setCategories({ expense: expenseCategories, income: incomeCategories });
    } catch (err) {
      setError('Failed to fetch data');
    }
  };

  const fetchFilters = () => {
    // Get filters from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const newFilters = {};
    
    for (const [key, value] of urlParams.entries()) {
      newFilters[key] = value;
    }
    
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const filterParams = {
        ...filters,
        page: pagination.page,
        per_page: pagination.limit
      };
      
      const data = await getEntries(filterParams);
      // Backend returns array directly; wrap it for consistent handling
      if (Array.isArray(data)) {
        setEntries(data);
        setPagination(prev => ({
          ...prev,
          total: data.length < pagination.limit ? (pagination.page - 1) * pagination.limit + data.length : data.length
        }));
      } else {
        setEntries(data.entries || []);
        setPagination(prev => ({
          ...prev,
          total: data.total || 0
        }));
      }
    } catch (err) {
      setError('Failed to fetch entries');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // Update URL params
    const urlParams = new URLSearchParams(newFilters).toString();
    window.history.replaceState(null, '', `${window.location.pathname}?${urlParams}`);
  };

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDeleteEntry = async () => {
    try {
      await deleteEntry(entryToDelete.id);
      fetchEntries();
      setShowDeleteModal(false);
      setEntryToDelete(null);
    } catch (err) {
      setError('Failed to delete entry');
    }
  };

  const openAddModal = () => {
    openAddEntryModal(fetchEntries);
  };

  const handleConfirmPending = async (entryId) => {
    try {
      await confirmPendingEntry(entryId);
      fetchEntries();
    } catch (err) {
      setError('Failed to confirm entry: ' + err.message);
    }
  };

  const handleDayClick = (dateStr) => {
    // Set filter to the single clicked date and switch to list view
    setFilters(prev => ({ ...prev, from: dateStr, to: dateStr }));
    setPagination(prev => ({ ...prev, page: 1 }));
    setViewMode('list');
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportEntries({ from: filters.from, to: filters.to });
    } catch (err) {
      setError('Failed to export entries: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount) => {
    if (masked) return MASK_PLACEHOLDER;
    const safe = (amount == null || Number.isNaN(amount)) ? 0 : amount;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(safe);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (initialLoading) return <div className="p-6">Loading entries...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Entries</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors duration-150"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export'}
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </button>
        </div>
      </div>

      {/* List / Calendar toggle — local state, not persisted */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setViewMode('list')}
          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-brand-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`
        }
        >
          <List className="h-4 w-4 mr-1.5" />
          List
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'calendar'
              ? 'bg-brand-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`
        }
        >
          <Calendar className="h-4 w-4 mr-1.5" />
          Calendar
        </button>
      </div>

      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        accounts={accounts}
        categories={categories}
        showTypeFilter={true}
        showDateFilters={true}
        showSearch={true}
      />

      {viewMode === 'calendar' ? (
        <div className="mt-6">
          <CalendarView onDayClick={handleDayClick} />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center p-12 border border-gray-200 rounded-lg mt-6">
          <p className="text-gray-500 mb-4">No entries found</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-brand-600 hover:text-brand-700 focus:outline-none transition-colors duration-150"
          >
            Add your first entry
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {loading && (
            <div className="text-center py-2 text-sm text-gray-400">
              Refreshing...
            </div>
          )}
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Category
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Tags
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Account
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Note
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Amount
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      {formatDate(entry.date)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        {entry.category_emoji && (
                          <span className="text-lg mr-2">{entry.category_emoji}</span>
                        )}
                        {entry.transfer_group_id ? (
                          <span className="text-gray-500">Transfer</span>
                        ) : (
                          entry.category_name
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap items-center gap-1">
                        {(entry.tags || []).slice(0, 3).map((tag) => (
                          <span key={tag.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border border-brand-300 text-brand-700 bg-brand-50">
                            {tag.name}
                          </span>
                        ))}
                        {(entry.tags || []).length > 3 && (
                          <span className="text-xs text-gray-400">+{entry.tags.length - 3} more</span>
                        )}
                        {(!entry.tags || entry.tags.length === 0) && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        {entry.account_emoji && (
                          <span className="text-lg mr-2">{entry.account_emoji}</span>
                        )}
                        {entry.transfer_group_id ? (
                          <div className="flex items-center">
                            <span className="text-blue-500 mr-1">⇄</span>
                            <span>{entry.account_name}</span>
                            <span className="text-gray-400 ml-1">(Transfer)</span>
                          </div>
                        ) : (
                          entry.account_name
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {entry.note}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-medium">
                      <span className={entry.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {masked ? formatCurrency(entry.amount) : `${entry.type === 'income' ? '+' : '-'}${formatCurrency(entry.amount)}`}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      {entry.transfer_group_id ? (
                        <button
                          onClick={() => navigate(`/transfers/${entry.transfer_group_id}/edit`)}
                          className="text-brand-600 hover:text-brand-900 transition-colors duration-150"
                        >
                          Edit Transfer
                        </button>
                      ) : (
                        <>
                          {entry.pending && (
                            <button
                              onClick={() => handleConfirmPending(entry.id)}
                              className="text-amber-600 hover:text-amber-800 mr-3 transition-colors duration-150"
                              aria-label="Confirm pending entry"
                              title="Confirm pending entry"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/entries/${entry.id}/edit`)}
                            className="text-brand-600 hover:text-brand-900 mr-3 transition-colors duration-150"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEntryToDelete(entry);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 transition-colors duration-150"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-150"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-150"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors duration-150"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page * pagination.limit >= pagination.total}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors duration-150"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Entry Modal — rendered globally in Layout.jsx via AddEntryModalContext (US-07) */}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transition-all duration-200">
            <h2 className="text-lg font-semibold mb-4">Delete Entry</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this entry? The entry will be moved to the Recycle Bin and can be restored within 30 days.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setEntryToDelete(null);
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEntry}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Entries;