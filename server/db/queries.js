const supabase = require('./client');

// Transfer queries
const createTransfer = async (payload) => {
  const { data, error } = await supabase
    .rpc('create_transfer', {
      p_from_account_id: payload.from_account_id,
      p_to_account_id: payload.to_account_id,
      p_amount: payload.amount,
      p_note: payload.note,
      p_date: payload.date
    });

  if (error) {
    throw error;
  }

  return data;
};

const updateTransfer = async (payload) => {
  const { data, error } = await supabase
    .rpc('update_transfer', {
      p_transfer_group_id: payload.transfer_group_id,
      p_from_account_id: payload.from_account_id,
      p_to_account_id: payload.to_account_id,
      p_amount: payload.amount,
      p_note: payload.note,
      p_date: payload.date
    });

  if (error) {
    throw error;
  }

  return data;
};

const deleteTransfer = async (transferGroupId) => {
  const { data, error } = await supabase
    .rpc('delete_transfer', {
      p_transfer_group_id: transferGroupId
    });

  if (error) {
    throw error;
  }

  return data;
};

const getTransferByGroupId = async (transferGroupId) => {
  const { data, error } = await supabase
    .from('entries')
    .select(`
      id, type, amount, note, date, created_at, updated_at,
      account_id,
      category_id,
      transfer_group_id,
      account:accounts(id, name, type, emoji),
      category:categories(id, name, type, color, icon)
    `)
    .eq('transfer_group_id', transferGroupId)
    .is('deleted_at', null)
    .order('type', { ascending: false }); // expense first, then income

  if (error) {
    throw error;
  }

  if (data.length === 0) {
    return null;
  }

  // Separate the entries
  const fromEntry = data.find(entry => entry.type === 'expense');
  const toEntry = data.find(entry => entry.type === 'income');

  // Flatten the response
  const flattenEntry = (entry) => ({
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    note: entry.note,
    date: entry.date,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    account_id: entry.account_id,
    category_id: entry.category_id,
    transfer_group_id: entry.transfer_group_id, // Add transfer_group_id
    account_name: entry.account.name,
    account_type: entry.account.type,
    account_emoji: entry.account.emoji,
    category_name: entry.category.name,
    category_type: entry.category.type,
    category_color: entry.category.color,
    category_icon: entry.category.icon
  });

  return {
    transfer_group_id: transferGroupId,
    from_entry: fromEntry ? flattenEntry(fromEntry) : null,
    to_entry: toEntry ? flattenEntry(toEntry) : null
  };
};

// Account queries
const getAccounts = async (sort = 'name', order = 'ASC') => {
  let query = supabase
    .from('accounts')
    .select(`
      id, name, type, description, emoji, created_at, updated_at,
      entries(count)
    `)
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  // Handle sorting
  let orderBy;
  switch(sort) {
    case 'balance':
      // For balance sorting, we need to calculate it - will sort in memory
      orderBy = 'name';
      break;
    case 'type':
      orderBy = 'type';
      break;
    default:
      orderBy = 'name';
  }

  query = query.order(orderBy, { ascending: order === 'ASC' });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // If sorting by balance, we need to calculate and re-sort
  if (sort === 'balance') {
    const accountsWithBalances = await Promise.all(data.map(async (account) => {
      const balance = await getAccountBalance(account.id);
      return { ...account, balance, entry_count: account.entries.length };
    }));

    accountsWithBalances.sort((a, b) => {
      return order === 'ASC' ? a.balance - b.balance : b.balance - a.balance;
    });

    return accountsWithBalances;
  }

  // Add entry_count from the joined data
  return data.map(account => ({
    ...account,
    entry_count: account.entries.length
  }));
};

const getAccountById = async (id) => {
  const { data, error } = await supabase
    .from('accounts')
    .select(`
      id, name, type, description, emoji, created_at, updated_at,
      entries(count)
    `)
    .eq('id', id)
    .is('deleted_at', null)  // Add deleted_at filter for soft-delete
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw error;
  }

  return {
    ...data,
    entry_count: data.entries.length
  };
};

const getAccountBalance = async (id) => {
  const { data, error } = await supabase
    .from('accounts')
    .select(`
      type,
      entries(type, amount)
    `)
    .eq('id', id)
    .is('deleted_at', null)  // Add deleted_at filter for soft-delete
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return 0;
    }
    throw error;
  }

  // Calculate totals
  const totalIncome = data.entries
    .filter(e => e.type === 'income' && !e.deleted_at)  // Add JS filter for soft-deleted entries
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpense = data.entries
    .filter(e => e.type === 'expense' && !e.deleted_at)  // Add JS filter for soft-deleted entries
    .reduce((sum, entry) => sum + entry.amount, 0);

  // Calculate balance based on account type
  let balance = 0;
  switch(data.type) {
    case 'debit':
    case 'invest':
      balance = totalIncome - totalExpense;
      break;
    case 'credit':
    case 'lent':
      balance = totalExpense - totalIncome;
      break;
    case 'borrowed':
      balance = totalIncome - totalExpense;
      break;
  }

  return balance;
};

const createAccount = async (account) => {
  const { name, type, description, emoji } = account;
  
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      name,
      type,
      description: description || null,
      emoji: emoji || null
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const updateAccount = async (id, account) => {
  const { name, type, description, emoji } = account;
  
  const { data, error } = await supabase
    .from('accounts')
    .update({
      name,
      type,
      description: description || null,
      emoji: emoji || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const deleteAccount = async (id) => {
  const { data, error } = await supabase
    .from('accounts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)  // Only update non-deleted accounts
    .select()
    .single();

  if (error) {
    throw error;
  }

  return { id: data.id, deleted_at: data.deleted_at };
};

const getAccountEntryCount = async (id) => {
  const { count, error } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', id)
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  if (error) {
    throw error;
  }

  return count;
};

const reassignAccountEntries = async (fromId, toId) => {
  const { data, error } = await supabase
    .from('entries')
    .update({ 
      account_id: toId,
      updated_at: new Date().toISOString()
    })
    .eq('account_id', fromId)
    .is('deleted_at', null);  // Only reassign non-deleted entries

  if (error) {
    throw error;
  }

  return { reassigned: data.length };
};

const deleteEntriesByAccount = async (id) => {
  const { data, error } = await supabase
    .from('entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('account_id', id)
    .is('deleted_at', null)  // Only update non-deleted entries
    .select();

  if (error) {
    throw error;
  }

  return { soft_deleted: data.length };
};

// Category queries
const getCategories = async (type = null) => {
  let query = supabase
    .from('categories')
    .select(`
      id, name, type, color, icon, is_default, sort_order, created_at, updated_at,
      entries(count)
    `);

  if (type) {
    query = query.eq('type', type);
  }

  query = query.order('sort_order', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // Add entry_count from the joined data
  return data.map(category => ({
    ...category,
    entry_count: category.entries.length
  }));
};

const getCategoryById = async (id) => {
  const { data, error } = await supabase
    .from('categories')
    .select(`
      id, name, type, color, icon, is_default, sort_order, created_at, updated_at,
      entries(count)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw error;
  }

  return {
    ...data,
    entry_count: data.entries.length
  };
};

const createCategory = async (category) => {
  const { name, type, color, icon, is_default, sort_order } = category;
  
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name,
      type,
      color: color || null,
      icon: icon || null,
      is_default: is_default || false,
      sort_order: sort_order || 0
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const updateCategory = async (id, category) => {
  const { name, type, color, icon, is_default, sort_order } = category;
  
  const { data, error } = await supabase
    .from('categories')
    .update({
      name,
      type,
      color: color || null,
      icon: icon || null,
      is_default: is_default || false,
      sort_order: sort_order || 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const deleteCategory = async (id) => {
  const { data, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return { id: data.id };
};

const getCategoryEntryCount = async (id) => {
  const { count, error } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  if (error) {
    throw error;
  }

  return count;
};

const reassignCategoryEntries = async (fromId, toId) => {
  const { data, error } = await supabase
    .from('entries')
    .update({ 
      category_id: toId,
      updated_at: new Date().toISOString()
    })
    .eq('category_id', fromId)
    .is('deleted_at', null);  // Only reassign non-deleted entries

  if (error) {
    throw error;
  }

  return { reassigned: data.length };
};

// New function for categories
const getFallbackCategory = async (type) => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type, color, icon, is_default, sort_order, created_at, updated_at')
    .eq('type', type)
    .eq('is_default', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw error;
  }

  return data;
};

// Entry queries
const getEntries = async (filters = {}) => {
  let query = supabase
    .from('entries')
    .select(`
      id, type, amount, note, date, created_at, updated_at,
      account:accounts(id, name, type, emoji),
      category:categories(id, name, type, color, icon),
      transfer_group_id
    `)
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  // Apply filters
  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  if (filters.account_id) {
    query = query.eq('account_id', filters.account_id);
  }

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters.from) {
    query = query.gte('date', filters.from);
  }

  if (filters.to) {
    query = query.lte('date', filters.to);
  }

  // Handle search
  if (filters.search) {
    // Escape % and _ characters to prevent wildcard matching
    const escapedSearch = filters.search.replace(/[%_]/g, '\$\u0026');
    query = query.ilike('note', `%${escapedSearch}%`);
  }

  // Handle sorting
  const orderBy = filters.orderBy || 'date';
  const orderDir = filters.order || 'DESC';
  query = query.order(orderBy, { ascending: orderDir === 'ASC' });

  // Handle pagination
  if (filters.limit !== undefined || filters.offset !== undefined) {
    const offset = filters.offset || 0;
    const limit = filters.limit || 10;
    query = query.range(offset, offset + limit - 1);
  } else if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // Flatten the response to match the original SQLite API
  return data.map(entry => ({
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    note: entry.note,
    date: entry.date,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    account_id: entry.account.id,
    category_id: entry.category.id,
    account_name: entry.account.name,
    account_type: entry.account.type,
    account_emoji: entry.account.emoji,
    category_name: entry.category.name,
    category_type: entry.category.type,
    category_color: entry.category.color,
    category_icon: entry.category.icon
  }));
};

const getEntryById = async (id) => {
  const { data, error } = await supabase
    .from('entries')
    .select(`
      id, type, amount, note, date, created_at, updated_at,
      account_id,
      category_id,
      transfer_group_id,
      account:accounts(id, name, type, emoji),
      category:categories(id, name, type, color, icon)
    `)
    .eq('id', id)
    .is('deleted_at', null)  // Add deleted_at filter for soft-delete
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw error;
  }

  // Flatten the response to match the original SQLite API
  return {
    id: data.id,
    type: data.type,
    amount: data.amount,
    note: data.note,
    date: data.date,
    created_at: data.created_at,
    updated_at: data.updated_at,
    account_id: data.account_id,
    category_id: data.category_id,
    transfer_group_id: data.transfer_group_id, // Add transfer_group_id
    account_name: data.account.name,
    account_type: data.account.type,
    account_emoji: data.account.emoji,
    category_name: data.category.name,
    category_type: data.category.type,
    category_color: data.category.color,
    category_icon: data.category.icon
  };
};

const createEntry = async (entry) => {
  const { type, amount, account_id, category_id, note, date } = entry;
  
  const { data, error } = await supabase
    .from('entries')
    .insert({
      type,
      amount,
      account_id,
      category_id,
      note: note || null,
      date
    })
    .select(`
      id, type, amount, note, date, created_at, updated_at,
      account:accounts(id, name, type, emoji),
      category:categories(id, name, type, color, icon),
      transfer_group_id
    `)
    .single();

  if (error) {
    throw error;
  }

  // Flatten the response to match the original SQLite API
  return {
    id: data.id,
    type: data.type,
    amount: data.amount,
    note: data.note,
    date: data.date,
    created_at: data.created_at,
    updated_at: data.updated_at,
    account_id: data.account.id,
    category_id: data.category.id,
    account_name: data.account.name,
    account_type: data.account.type,
    account_emoji: data.account.emoji,
    category_name: data.category.name,
    category_type: data.category.type,
    category_color: data.category.color,
    category_icon: data.category.icon
  };
};

const updateEntry = async (id, entry) => {
  const { type, amount, account_id, category_id, note, date } = entry;
  
  const { data, error } = await supabase
    .from('entries')
    .update({
      type,
      amount,
      account_id,
      category_id,
      note: note || null,
      date,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`
      id, type, amount, note, date, created_at, updated_at,
      account:accounts(id, name, type, emoji),
      category:categories(id, name, type, color, icon),
      transfer_group_id
    `)
    .single();

  if (error) {
    throw error;
  }

  // Flatten the response to match the original SQLite API
  return {
    id: data.id,
    type: data.type,
    amount: data.amount,
    note: data.note,
    date: data.date,
    created_at: data.created_at,
    updated_at: data.updated_at,
    account_id: data.account.id,
    category_id: data.category.id,
    transfer_group_id: data.transfer_group_id, // Add transfer_group_id
    account_name: data.account.name,
    account_type: data.account.type,
    account_emoji: data.account.emoji,
    category_name: data.category.name,
    category_type: data.category.type,
    category_color: data.category.color,
    category_icon: data.category.icon
  };
};

const deleteEntry = async (id) => {
  const { data, error } = await supabase
    .from('entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)  // Only update non-deleted entries
    .select()
    .single();

  if (error) {
    throw error;
  }

  return { id: data.id, deleted_at: data.deleted_at };
};

// New function for entries
const bulkDeleteEntries = async (ids) => {
  const { data: entriesData, error: entriesError } = await supabase
    .from('entries')
    .select('id, transfer_group_id')
    .in('id', ids)
    .is('deleted_at', null);  // Only get non-deleted entries

  if (entriesError) {
    throw entriesError;
  }

  // Check if any of the entries are part of a transfer pair
  // and add their paired entries to the list to delete
  const allIdsToDelete = [...ids];
  for (const entry of entriesData) {
    if (entry.transfer_group_id) {
      // Find the paired entry
      const { data: pairedEntries, error: pairedError } = await supabase
        .from('entries')
        .select('id')
        .eq('transfer_group_id', entry.transfer_group_id)
        .not('id', 'eq', entry.id)
        .is('deleted_at', null);

      if (pairedError) {
        throw pairedError;
      }

      // Add paired entry IDs to delete list
      pairedEntries.forEach(pairedEntry => {
        if (!allIdsToDelete.includes(pairedEntry.id)) {
          allIdsToDelete.push(pairedEntry.id);
        }
      });
    }
  }

  // Now delete all entries
  const { data: deletedData, error: deleteError } = await supabase
    .from('entries')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', allIdsToDelete)
    .is('deleted_at', null)  // Only update non-deleted entries
    .select();

  if (deleteError) {
    throw deleteError;
  }

  return { soft_deleted: deletedData.length };
};

// Export queries
const getEntriesForExport = async (from, to) => {
  let query = supabase
    .from('entries')
    .select(`
      id, type, amount, note, date, created_at, updated_at,
      account:accounts(name),
      category:categories(name),
      transfer_group_id
    `)
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  if (from) {
    query = query.gte('date', from);
  }

  if (to) {
    query = query.lte('date', to);
  }

  query = query.order('date', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // Flatten the response to match the original SQLite API
  return data.map(entry => ({
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    note: entry.note,
    date: entry.date,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    account_name: entry.account.name,
    category_name: entry.category.name,
    transfer_group_id: entry.transfer_group_id // Add transfer_group_id
  }));
};

const getAccountsForExport = async () => {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, type, description, emoji, created_at, updated_at')
    .is('deleted_at', null)  // Add deleted_at filter for soft-delete
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
};

// Dashboard queries (renamed functions)
const getDashboardKPIs = async (from, to) => {
  // First get all entries for income/expense calculations
  let entriesQuery = supabase
    .from('entries')
    .select('type, amount')
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  if (from) {
    entriesQuery = entriesQuery.gte('date', from);
  }

  if (to) {
    entriesQuery = entriesQuery.lte('date', to);
  }

  const { data: entriesData, error: entriesError } = await entriesQuery;

  if (entriesError) {
    throw entriesError;
  }

  // Calculate totals (excluding transfers)
  const totalIncome = entriesData
    .filter(entry => entry.type === 'income' && entry.transfer_group_id === null)
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpense = entriesData
    .filter(entry => entry.type === 'expense' && entry.transfer_group_id === null)
    .reduce((sum, entry) => sum + entry.amount, 0);

  const net = totalIncome - totalExpense;

  // Now get all accounts and their entries for balance calculation
  let accountsQuery = supabase
    .from('accounts')
    .select(`
      id, type,
      entries(type, amount)
    `)
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  const { data: accountsData, error: accountsError } = await accountsQuery;

  if (accountsError) {
    throw accountsError;
  }

  // Calculate total balance across all accounts
  let totalBalance = 0;
  accountsData.forEach(account => {
    // Filter entries by date if specified
    let accountEntries = account.entries;
    if (from || to) {
      accountEntries = account.entries.filter(entry => {
        const entryDate = new Date(entry.date);
        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;
        
        return (!fromDate || entryDate >= fromDate) && (!toDate || entryDate <= toDate);
      });
    }
    
    // Add JS filter for soft-deleted entries
    accountEntries = accountEntries.filter(e => !e.deleted_at);
    
    // Calculate account balance
    const totalIncome = accountEntries
      .filter(e => e.type === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalExpense = accountEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0);

    // Calculate balance based on account type
    let accountBalance = 0;
    switch(account.type) {
      case 'debit':
      case 'invest':
        accountBalance = totalIncome - totalExpense;
        break;
      case 'credit':
      case 'lent':
        accountBalance = totalExpense - totalIncome;
        break;
      case 'borrowed':
        accountBalance = totalIncome - totalExpense;
        break;
    }
    
    // Aggregate into net worth: assets (debit/invest/lent) add, liabilities
    // (credit/borrowed) subtract, per BRD FR-5 account-type semantics.
    switch (account.type) {
      case 'debit':
      case 'invest':
      case 'lent':
        totalBalance += accountBalance;
        break;
      case 'credit':
      case 'borrowed':
        totalBalance -= accountBalance;
        break;
    }
  });

  return {
    total_income: totalIncome,
    total_expense: totalExpense,
    net,
    total_balance: totalBalance
  };
};

const getDashboardMoM = async (from, to) => {
  let query = supabase
    .from('entries')
    .select('date, type, amount, transfer_group_id')
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  if (from) {
    query = query.gte('date', from);
  }

  if (to) {
    query = query.lte('date', to);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // Group by month and calculate totals
  const monthlyData = {};

  data.forEach(entry => {
    // Skip transfer entries
    if (entry.transfer_group_id !== null) return;
    
    // Extract year-month from date
    const date = new Date(entry.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        total_income: 0,
        total_expense: 0
      };
    }

    if (entry.type === 'income') {
      monthlyData[monthKey].total_income += entry.amount;
    } else {
      monthlyData[monthKey].total_expense += entry.amount;
    }
  });

  return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
};

const getExpenseBreakdown = async (from, to) => {
  let query = supabase
    .from('entries')
    .select(`
      category_id,
      categories(name, type, color, icon),
      type,
      amount,
      transfer_group_id
    `)
    .eq('type', 'expense')
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  if (from) {
    query = query.gte('date', from);
  }

  if (to) {
    query = query.lte('date', to);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // Group by category and calculate totals
  const categoryMap = {};

  data.forEach(entry => {
    const categoryId = entry.category_id;
    if (!categoryMap[categoryId]) {
      categoryMap[categoryId] = {
        id: categoryId,
        name: entry.categories.name,
        type: entry.categories.type,
        color: entry.categories.color,
        icon: entry.categories.icon,
        total_amount: 0
      };
    }

    categoryMap[categoryId].total_amount += entry.amount;
  });

  return Object.values(categoryMap);
};

const getIncomeBreakdown = async (from, to) => {
  let query = supabase
    .from('entries')
    .select(`
      category_id,
      categories(name, type, color, icon),
      type,
      amount,
      transfer_group_id
    `)
    .eq('type', 'income')
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  if (from) {
    query = query.gte('date', from);
  }

  if (to) {
    query = query.lte('date', to);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // Group by category and calculate totals
  const categoryMap = {};

  data.forEach(entry => {
    const categoryId = entry.category_id;
    if (!categoryMap[categoryId]) {
      categoryMap[categoryId] = {
        id: categoryId,
        name: entry.categories.name,
        type: entry.categories.type,
        color: entry.categories.color,
        icon: entry.categories.icon,
        total_amount: 0
      };
    }

    categoryMap[categoryId].total_amount += entry.amount;
  });

  return Object.values(categoryMap);
};

const getDashboardAccounts = async (from, to) => {
  let query = supabase
    .from('entries')
    .select(`
      account_id,
      accounts(name, type),
      type,
      amount,
      transfer_group_id
    `)
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  if (from) {
    query = query.gte('date', from);
  }

  if (to) {
    query = query.lte('date', to);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // Group by account and calculate balances
  const accountMap = {};

  data.forEach(entry => {
    // Skip transfer entries
    if (entry.transfer_group_id !== null) return;
    
    const accountId = entry.account_id;
    if (!accountMap[accountId]) {
      accountMap[accountId] = {
        id: accountId,
        name: entry.accounts.name,
        type: entry.accounts.type,
        total_income: 0,
        total_expense: 0
      };
    }

    if (entry.type === 'income') {
      accountMap[accountId].total_income += entry.amount;
    } else {
      accountMap[accountId].total_expense += entry.amount;
    }
  });

  // Calculate balances based on account types
  const accounts = Object.values(accountMap).map(account => {
    let balance = 0;
    switch(account.type) {
      case 'debit':
      case 'invest':
        balance = account.total_income - account.total_expense;
        break;
      case 'credit':
      case 'lent':
        balance = account.total_expense - account.total_income;
        break;
      case 'borrowed':
        balance = account.total_income - account.total_expense;
        break;
    }

    return {
      ...account,
      balance
    };
  });

  return accounts;
};

const getRecentEntries = async (from, to, limit = 10) => {
  let query = supabase
    .from('entries')
    .select(`
      id, type, amount, note, date, created_at, updated_at,
      account:accounts(id, name, type, emoji),
      category:categories(id, name, type, color, icon),
      transfer_group_id
    `)
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  if (from) {
    query = query.gte('date', from);
  }

  if (to) {
    query = query.lte('date', to);
  }

  query = query.order('date', { ascending: false }).limit(limit);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // Flatten the response to match the original SQLite API
  return data.map(entry => ({
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    note: entry.note,
    date: entry.date,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    account_id: entry.account.id,
    category_id: entry.category.id,
    account_name: entry.account.name,
    account_type: entry.account.type,
    account_emoji: entry.account.emoji,
    category_name: entry.category.name,
    category_type: entry.category.type,
    category_color: entry.category.color,
    category_icon: entry.category.icon
  }));
};

// Settings queries
const getSetting = async (key) => {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw error;
  }

  return data.value;
};

const setSetting = async (key, value) => {
  const { data, error } = await supabase
    .from('settings')
    .upsert({ key, value })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const getAllSettings = async () => {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value');

  if (error) {
    throw error;
  }

  // Convert to key-value object
  const settings = {};
  data.forEach(setting => {
    settings[setting.key] = setting.value;
  });

  return settings;
};

// New function for settings
const getEntryCount = async (filters = {}) => {
  let query = supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  // Apply filters
  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  if (filters.account_id) {
    query = query.eq('account_id', filters.account_id);
  }

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters.from) {
    query = query.gte('date', filters.from);
  }

  if (filters.to) {
    query = query.lte('date', filters.to);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count;
};

// Recycle Bin functions
const getRecycleBin = async (filters = {}) => {
  const { type, page = 1, per_page = 20 } = filters;
  const offset = (page - 1) * per_page;

  // Get soft-deleted accounts
  let accountsQuery = supabase
    .from('accounts')
    .select(`
      id, name, type, description, emoji, deleted_at,
      entries(count)
    `)
    .not('deleted_at', 'is', null);

  // Get soft-deleted entries
  let entriesQuery = supabase
    .from('entries')
    .select(`
      id, type, amount, note, date, deleted_at, transfer_group_id,
      account:accounts(name),
      category:categories(name, type, color, icon)
    `)
    .not('deleted_at', 'is', null);

  // Apply type filter if specified
  if (type === 'accounts') {
    entriesQuery = entriesQuery.eq('id', 0); // No entries when filtering by accounts
  } else if (type === 'entries') {
    accountsQuery = accountsQuery.eq('id', 0); // No accounts when filtering by entries
  }

  // Execute both queries
  const [accountsResult, entriesResult] = await Promise.all([
    accountsQuery,
    entriesQuery
  ]);

  if (accountsResult.error) throw accountsResult.error;
  if (entriesResult.error) throw entriesResult.error;

  // Process accounts data
  const accounts = accountsResult.data.map(account => ({
    type: 'account',
    id: account.id,
    label: account.name,
    account_type: account.type,
    deleted_at: account.deleted_at,
    days_remaining: Math.max(0, 30 - Math.floor((new Date() - new Date(account.deleted_at)) / (1000 * 60 * 60 * 24))),
    entry_count: account.entries.length
  }));

  // Process entries data
  const entries = entriesResult.data.map(entry => ({
    type: 'entry',
    id: entry.id,
    label: `${entry.note || 'Untitled'} — ₱${entry.amount.toLocaleString()}`,
    account_name: entry.account?.name || 'Unknown Account',
    date: entry.date,
    deleted_at: entry.deleted_at,
    transfer_group_id: entry.transfer_group_id, // Add transfer_group_id
    days_remaining: Math.max(0, 30 - Math.floor((new Date() - new Date(entry.deleted_at)) / (1000 * 60 * 60 * 24)))
  }));

  // Merge and sort by deleted_at DESC
  const items = [...accounts, ...entries]
    .sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at))
    .slice(offset, offset + per_page);

  return {
    items,
    pagination: {
      page,
      per_page,
      total: accounts.length + entries.length
    }
  };
};

const restoreItem = async (type, id) => {
  // First, get the item to check if it exists and get its deleted_at timestamp
  let item;
  if (type === 'accounts') {
    const { data, error } = await supabase
      .from('accounts')
      .select('deleted_at')
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return { restored: false, error: 'Item not found or already restored' };
      }
      throw error;
    }
    item = data;
  } else if (type === 'entries') {
    const { data, error } = await supabase
      .from('entries')
      .select('deleted_at, transfer_group_id')
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return { restored: false, error: 'Item not found or already restored' };
      }
      throw error;
    }
    item = data;
  } else {
    return { restored: false, error: 'Invalid type' };
  }

  // Restore the item
  const { error: updateError } = await supabase
    .from(type)
    .update({ deleted_at: null })
    .eq('id', id);

  if (updateError) {
    throw updateError;
  }

  // For entries that are part of a transfer pair, also restore the paired row
  let entriesRestored = 0;
  if (type === 'entries' && item.transfer_group_id) {
    // Find and restore the paired entry
    const { error: restorePairedError } = await supabase
      .from('entries')
      .update({ deleted_at: null })
      .eq('transfer_group_id', item.transfer_group_id)
      .not('id', 'eq', id);

    if (restorePairedError) {
      throw restorePairedError;
    }
    
    entriesRestored = 1; // One paired entry restored
  }
  
  // For accounts, also restore entries that were deleted at the same time (within 1 second)
  if (type === 'accounts') {
    const accountDeletedAt = new Date(item.deleted_at);
    const timeWindowStart = new Date(accountDeletedAt.getTime() - 1000); // 1 second before
    const timeWindowEnd = new Date(accountDeletedAt.getTime() + 1000);  // 1 second after

    const { data: entriesData, error: entriesError } = await supabase
      .from('entries')
      .select('id')
      .eq('account_id', id)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', timeWindowStart.toISOString())
      .lte('deleted_at', timeWindowEnd.toISOString());

    if (entriesError) {
      throw entriesError;
    }

    if (entriesData.length > 0) {
      const entryIds = entriesData.map(entry => entry.id);
      const { error: restoreEntriesError } = await supabase
        .from('entries')
        .update({ deleted_at: null })
        .in('id', entryIds);

      if (restoreEntriesError) {
        throw restoreEntriesError;
      }

      entriesRestored = entryIds.length;
    }
  }

  return { 
    restored: true, 
    id, 
    type,
    entries_restored: entriesRestored
  };
};

const purgeExpired = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Purge expired entries
  const { data: entriesData, error: entriesError } = await supabase
    .from('entries')
    .delete()
    .lt('deleted_at', thirtyDaysAgo)
    .select();

  if (entriesError) {
    throw entriesError;
  }

  // Purge expired accounts
  const { data: accountsData, error: accountsError } = await supabase
    .from('accounts')
    .delete()
    .lt('deleted_at', thirtyDaysAgo)
    .select();

  if (accountsError) {
    throw accountsError;
  }

  return {
    accounts: accountsData.length,
    entries: entriesData.length
  };
};

// Budget queries
const getBudgets = async (filters = {}) => {
  let query = supabase
    .from('budgets')
    .select(`
      id, category_id, amount, cycle, cycle_start, cycle_end,
      reuse_next, created_at, updated_at,
      category:categories(id, name, type, color, icon)
    `);

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.map(b => ({
    id: b.id,
    category_id: b.category_id,
    category_name: b.category?.name || null,
    category_color: b.category?.color || null,
    category_icon: b.category?.icon || null,
    amount: b.amount,
    cycle: b.cycle,
    cycle_start: b.cycle_start,
    cycle_end: b.cycle_end,
    reuse_next: b.reuse_next,
    created_at: b.created_at,
    updated_at: b.updated_at,
  }));
};

const getBudgetById = async (id) => {
  const { data, error } = await supabase
    .from('budgets')
    .select(`
      id, category_id, amount, cycle, cycle_start, cycle_end,
      reuse_next, created_at, updated_at,
      category:categories(id, name, type, color, icon)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return {
    id: data.id,
    category_id: data.category_id,
    category_name: data.category?.name || null,
    category_color: data.category?.color || null,
    category_icon: data.category?.icon || null,
    amount: data.amount,
    cycle: data.cycle,
    cycle_start: data.cycle_start,
    cycle_end: data.cycle_end,
    reuse_next: data.reuse_next,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

const createBudget = async (payload) => {
  const { category_id, amount, cycle, cycle_start, cycle_end, reuse_next } = payload;

  // Check for duplicate category_id before insert (enforce one-budget-per-category at query layer)
  const { data: existing, error: checkError } = await supabase
    .from('budgets')
    .select('id')
    .eq('category_id', category_id)
    .maybeSingle();

  if (checkError) {
    throw checkError;
  }

  if (existing) {
    const err = new Error('A budget already exists for this category');
    err.code = 'DUPLICATE_BUDGET';
    err.status = 409;
    throw err;
  }

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      category_id,
      amount,
      cycle,
      cycle_start,
      cycle_end: cycle_end || null,
      reuse_next: reuse_next || false,
    })
    .select(`
      id, category_id, amount, cycle, cycle_start, cycle_end,
      reuse_next, created_at, updated_at,
      category:categories(id, name, type, color, icon)
    `)
    .single();

  if (error) {
    // If the DB unique constraint fires (race condition), surface as DUPLICATE_BUDGET
    if (error.code === '23505') {
      const err = new Error('A budget already exists for this category');
      err.code = 'DUPLICATE_BUDGET';
      err.status = 409;
      throw err;
    }
    throw error;
  }

  return {
    id: data.id,
    category_id: data.category_id,
    category_name: data.category?.name || null,
    category_color: data.category?.color || null,
    category_icon: data.category?.icon || null,
    amount: data.amount,
    cycle: data.cycle,
    cycle_start: data.cycle_start,
    cycle_end: data.cycle_end,
    reuse_next: data.reuse_next,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

const updateBudget = async (id, payload) => {
  const { category_id, amount, cycle, cycle_start, cycle_end, reuse_next } = payload;

  const updateFields = { updated_at: new Date().toISOString() };
  if (category_id !== undefined) updateFields.category_id = category_id;
  if (amount !== undefined) updateFields.amount = amount;
  if (cycle !== undefined) updateFields.cycle = cycle;
  if (cycle_start !== undefined) updateFields.cycle_start = cycle_start;
  if (cycle_end !== undefined) updateFields.cycle_end = cycle_end;
  if (reuse_next !== undefined) updateFields.reuse_next = reuse_next;

  const { data, error } = await supabase
    .from('budgets')
    .update(updateFields)
    .eq('id', id)
    .select(`
      id, category_id, amount, cycle, cycle_start, cycle_end,
      reuse_next, created_at, updated_at,
      category:categories(id, name, type, color, icon)
    `)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    // If the DB unique constraint fires on category_id change
    if (error.code === '23505') {
      const err = new Error('A budget already exists for this category');
      err.code = 'DUPLICATE_BUDGET';
      err.status = 409;
      throw err;
    }
    throw error;
  }

  return {
    id: data.id,
    category_id: data.category_id,
    category_name: data.category?.name || null,
    category_color: data.category?.color || null,
    category_icon: data.category?.icon || null,
    amount: data.amount,
    cycle: data.cycle,
    cycle_start: data.cycle_start,
    cycle_end: data.cycle_end,
    reuse_next: data.reuse_next,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

const deleteBudget = async (id) => {
  const { data, error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return { id: data.id };
};

// getBudgetsWithCategories — same as getBudgets but without filters, used by dashboard
const getBudgetsWithCategories = async () => {
  return getBudgets();
};

module.exports = {
  // Transfer queries
  createTransfer,
  updateTransfer,
  deleteTransfer,
  getTransferByGroupId,

  // Account queries
  getAccounts,
  getAccountById,
  getAccountBalance,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountEntryCount,
  reassignAccountEntries,
  deleteEntriesByAccount,

  // Category queries
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryEntryCount,
  reassignCategoryEntries,
  getFallbackCategory,

  // Entry queries
  getEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  bulkDeleteEntries,
  getEntriesForExport,
  getAccountsForExport,

  // Dashboard queries
  getDashboardKPIs,
  getDashboardMoM,
  getExpenseBreakdown,
  getIncomeBreakdown,
  getDashboardAccounts,
  getRecentEntries,

  // Budget queries
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetsWithCategories,

  // Settings queries
  getSetting,
  setSetting,
  getAllSettings,
  getEntryCount,

  // Recycle Bin functions
  getRecycleBin,
  restoreItem,
  purgeExpired
};