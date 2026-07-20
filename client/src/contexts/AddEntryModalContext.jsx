import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getAccounts, getCategories, createEntry } from '../lib/api';

const AddEntryModalContext = createContext(null);

export function AddEntryModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    account_id: '',
    category_id: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
    pending: false,
  });
  const [selectedTags, setSelectedTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [onSuccess, setOnSuccess] = useState(null);

  // Fetch accounts + categories when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const results = await Promise.allSettled([
        getAccounts(),
        getCategories('expense'),
        getCategories('income'),
      ]);
      const [accountsResult, expenseResult, incomeResult] = results;
      if (accountsResult.status === 'fulfilled') {
        setAccounts(accountsResult.value);
        if (accountsResult.value.length === 1) {
          setForm(prev => ({ ...prev, account_id: accountsResult.value[0].id }));
        }
      }
      const expenseCategories = expenseResult.status === 'fulfilled' ? expenseResult.value : [];
      const incomeCategories = incomeResult.status === 'fulfilled' ? incomeResult.value : [];
      setCategories({ expense: expenseCategories, income: incomeCategories });
    } catch {
      // Silent fail — modal will show empty dropdowns
    }
  };

  const openAddEntryModal = useCallback((callback) => {
    // Reset form to defaults
    setForm({
      type: 'expense',
      amount: '',
      account_id: '',
      category_id: '',
      note: '',
      date: new Date().toISOString().split('T')[0],
      pending: false,
    });
    setSelectedTags([]);
    setError('');
    setOnSuccess(() => callback || null);
    setIsOpen(true);
  }, []);

  const closeAddEntryModal = useCallback(() => {
    setIsOpen(false);
    setError('');
    setOnSuccess(null);
  }, []);

  const handleTypeChange = (type) => {
    setForm(prev => ({ ...prev, type, category_id: '' }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError('');

    try {
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
        date: form.date,
        tag_ids: selectedTags.map(t => t.id),
        pending: form.pending || false,
      });

      // Reset form but keep type and date
      setForm(prev => ({
        ...prev,
        amount: '',
        account_id: '',
        category_id: '',
        note: '',
        pending: false,
      }));
      setSelectedTags([]);
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to create entry: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const value = {
    isOpen,
    accounts,
    categories,
    form,
    setForm,
    selectedTags,
    setSelectedTags,
    saving,
    error,
    openAddEntryModal,
    closeAddEntryModal,
    handleTypeChange,
    handleSubmit,
  };

  return <AddEntryModalContext.Provider value={value}>{children}</AddEntryModalContext.Provider>;
}

export function useAddEntryModal() {
  const context = useContext(AddEntryModalContext);
  if (!context) {
    throw new Error('useAddEntryModal must be used within an AddEntryModalProvider');
  }
  return context;
}