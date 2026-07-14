const supabase = require('./client');

// Account queries
const getAccounts = async (sort = 'name', order = 'ASC') => {
  let query = supabase
    .from('accounts')
    .select(`
      id, name, type, description, emoji, created_at, updated_at,
      entries(count)
    `);

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
    .filter(e => e.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpense = data.entries
    .filter(e => e.type === 'expense')
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
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return { id: data.id };
};

const getAccountEntryCount = async (id) => {
  const { count, error } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', id);

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
    .eq('account_id', fromId);

  if (error) {
    throw error;
  }

  return { reassigned: data.length };
};

const deleteEntriesByAccount = async (id) => {
  const { data, error } = await supabase
    .from('entries')
    .delete()
    .eq('account_id', id);

  if (error) {
    throw error;
  }

  return { deleted: data.length };
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
    .eq('category_id', id);

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
    .eq('category_id', fromId);

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
      category:categories(id, name, type, color, icon)
    `);

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
      account:accounts(id, name, type, emoji),
      category:categories(id, name, type, color, icon)
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
      category:categories(id, name, type, color, icon)
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
      category:categories(id, name, type, color, icon)
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

const deleteEntry = async (id) => {
  const { data, error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return { id: data.id };
};

// New function for entries
const bulkDeleteEntries = async (ids) => {
  const { data, error } = await supabase
    .from('entries')
    .delete()
    .in('id', ids);

  if (error) {
    throw error;
  }

  return { deleted: data.length };
};

// Export queries
const getEntriesForExport = async (from, to) => {
  let query = supabase
    .from('entries')
    .select(`
      id, type, amount, note, date, created_at, updated_at,
      account:accounts(name),
      category:categories(name)
    `);

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
    category_name: entry.category.name
  }));
};

const getAccountsForExport = async () => {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, type, description, emoji, created_at, updated_at')
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
    .select('type, amount');

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

  // Calculate totals
  const totalIncome = entriesData
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpense = entriesData
    .filter(entry => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const net = totalIncome - totalExpense;

  // Now get all accounts and their entries for balance calculation
  let accountsQuery = supabase
    .from('accounts')
    .select(`
      id, type,
      entries(type, amount)
    `);

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
    .select('date, type, amount');

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
      amount
    `)
    .eq('type', 'expense');

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
      amount
    `)
    .eq('type', 'income');

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
      amount
    `);

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
      category:categories(id, name, type, color, icon)
    `);

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
    .select('*', { count: 'exact', head: true });

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

module.exports = {
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

  // Settings queries
  getSetting,
  setSetting,
  getAllSettings,
  getEntryCount
};