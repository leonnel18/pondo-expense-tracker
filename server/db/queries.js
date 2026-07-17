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

// ── Tag helpers (US-14, v2.5) ──────────────────────────────────────────────
// Flatten the nested entry_tags join into a simple tags array.
// Used by getEntries, getEntryById, createEntry, updateEntry to attach tags.
const flattenTags = (entryTags) => {
  if (!entryTags || entryTags.length === 0) return [];
  return entryTags.map(et => ({
    id: et.tag_id || (et.tags && et.tags.id),
    name: et.tags ? et.tags.name : et.name,
  }));
};

// Insert entry_tags rows for a given entry ID. Used by createEntry and updateEntry.
const insertEntryTags = async (entryId, tagIds) => {
  if (!tagIds || tagIds.length === 0) return;
  const rows = tagIds.map(tag_id => ({ entry_id: entryId, tag_id }));
  const { error } = await supabase.from('entry_tags').insert(rows);
  if (error) throw error;
};

// Delete all entry_tags for a given entry ID. Used by updateEntry (full replacement).
const deleteEntryTags = async (entryId) => {
  const { error } = await supabase.from('entry_tags').delete().eq('entry_id', entryId);
  if (error) throw error;
};

// Entry queries
const getEntries = async (filters = {}) => {
  // If tag_id filter is present, resolve matching entry IDs at the query level
  // (R3 mitigation: push tag filter into the DB query, not a post-fetch JS filter,
  // to avoid returning fewer than per_page results when some entries on the
  // page don't have the tag).
  let tagFilteredIds = null;
  if (filters.tag_id) {
    const { data: tagRows, error: tagError } = await supabase
      .from('entry_tags')
      .select('entry_id')
      .eq('tag_id', filters.tag_id);
    if (tagError) throw tagError;
    tagFilteredIds = tagRows.map(r => r.entry_id);
    // If no entries have this tag, return empty immediately
    if (tagFilteredIds.length === 0) return [];
  }

  let query = supabase
    .from('entries')
    .select(`
      id, type, amount, note, date, created_at, updated_at,
      account:accounts(id, name, type, emoji),
      category:categories(id, name, type, color, icon),
      transfer_group_id,
      entry_tags(tag_id, tags(id, name))
    `)
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  // Apply tag_id filter at query level (R3 — not a post-fetch JS filter)
  if (tagFilteredIds !== null) {
    query = query.in('id', tagFilteredIds);
  }

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

  // Flatten the response to match the original SQLite API, with tags array
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
    category_icon: entry.category.icon,
    tags: flattenTags(entry.entry_tags)
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
      category:categories(id, name, type, color, icon),
      entry_tags(tag_id, tags(id, name))
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
    category_icon: data.category.icon,
    tags: flattenTags(data.entry_tags)
  };
};

// `internal.recurrenceId`, if present, links the created entry back to the
// recurrence that generated it. This is NOT part of the public `entry`
// payload shape — it's a second argument only the recurrence cron sweep
// (processRecurrences) and the recurrence confirm route pass, so a client
// POSTing to /api/entries can never forge a recurrence_id onto an entry by
// including it in the request body (same reasoning as transfer_group_id,
// which is likewise only ever set by the transfer RPC functions, never by
// createEntry's caller-supplied `entry` object).
const createEntry = async (entry, internal = {}) => {
  const { type, amount, account_id, category_id, note, date } = entry;
  const { recurrenceId } = internal;
  // tagIds is optional — only present when the caller explicitly provides tags.
  // It is NOT part of the `entry` payload shape (same reasoning as recurrenceId —
  // the route extracts it from req.body separately and passes it via `internal`).
  const tagIds = internal.tagIds; // array of tag IDs, or undefined if not provided

  const { data, error } = await supabase
    .from('entries')
    .insert({
      type,
      amount,
      account_id,
      category_id,
      note: note || null,
      date,
      recurrence_id: recurrenceId || null
    })
    .select(`
      id, type, amount, note, date, created_at, updated_at,
      account:accounts(id, name, type, emoji),
      category:categories(id, name, type, color, icon),
      transfer_group_id, recurrence_id
    `)
    .single();

  if (error) {
    throw error;
  }

  // Insert tag associations if tagIds was provided (even if empty — empty means
  // "no tags to insert," which is a no-op, not an error).
  // Note: tagIds being undefined means "don't touch tags" — but for createEntry
  // there are no existing tags to preserve, so undefined and [] both result in
  // no entry_tags rows being created. The distinction matters for updateEntry.
  if (tagIds !== undefined && tagIds.length > 0) {
    await insertEntryTags(data.id, tagIds);
  }

  // Fetch tags for the response (empty array if no tags were assigned)
  let entryTags = [];
  if (tagIds !== undefined && tagIds.length > 0) {
    const { data: tagsData, error: tagsError } = await supabase
      .from('entry_tags')
      .select('tag_id, tags(id, name)')
      .eq('entry_id', data.id);
    if (tagsError) throw tagsError;
    entryTags = flattenTags(tagsData);
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
    category_icon: data.category.icon,
    recurrence_id: data.recurrence_id,
    tags: entryTags
  };
};

const updateEntry = async (id, entry, internal = {}) => {
  const { type, amount, account_id, category_id, note, date } = entry;
  const { tagIds } = internal; // optional array — undefined = don't touch tags
  
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

  // Full tag replacement: if tagIds is provided (including empty array),
  // delete all existing entry_tags for this entry and insert the new set.
  // tagIds === undefined means "don't touch tags" — leave existing associations.
  // tagIds === [] means "clear all tags" — delete existing, insert nothing.
  if (tagIds !== undefined) {
    await deleteEntryTags(data.id);
    if (tagIds.length > 0) {
      await insertEntryTags(data.id, tagIds);
    }
  }

  // Fetch current tags for the response
  let entryTags = [];
  const { data: tagsData, error: tagsError } = await supabase
    .from('entry_tags')
    .select('tag_id, tags(id, name)')
    .eq('entry_id', data.id);
  if (tagsError) throw tagsError;
  entryTags = flattenTags(tagsData);

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
    category_icon: data.category.icon,
    tags: entryTags
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
      transfer_group_id,
      entry_tags(tags(name))
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

  // Flatten the response to match the original SQLite API, with tags as comma-separated string
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
    transfer_group_id: entry.transfer_group_id, // Add transfer_group_id
    tags: (entry.entry_tags || []).map(et => et.tags ? et.tags.name : null).filter(Boolean).join(', ')
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
      entries(type, amount, deleted_at)
    `)
    .is('deleted_at', null);  // Add deleted_at filter for soft-delete

  const { data: accountsData, error: accountsError } = await accountsQuery;

  if (accountsError) {
    throw accountsError;
  }

  // Calculate total balance across all accounts
  let totalBalance = 0;
  accountsData.forEach(account => {
    // Total balance is an all-time running figure (like a bank statement),
    // NOT a period metric. Do NOT apply the from/to date window here —
    // only filter out soft-deleted entries. This matches getAccountBalance()
    // (line ~185) and getDashboardAccounts() (called with no from/to) which
    // both correctly skip date-filtering for balance calculations.
    const accountEntries = account.entries.filter(e => !e.deleted_at);
    
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
    net_balance: net,
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

// App events (US-27) — minimal, fire-and-forget event log.
// Never throws: a logging failure must never block or fail the
// user-facing request that triggered it. Callers should invoke this
// without awaiting it (or await it but ignore the result either way).
const logAppEvent = async (eventType, metadata = null) => {
  try {
    const { error } = await supabase
      .from('app_events')
      .insert({ event_type: eventType, metadata });

    if (error) {
      console.error('logAppEvent failed:', eventType, error.message);
    }
  } catch (err) {
    console.error('logAppEvent failed:', eventType, err.message);
  }
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

// ── Recurrence queries (US-16, v2.3) ────────────────────────────────────────
const { computeNextDueDate, computeInstallmentEndDate } = require('../lib/recurrence-cycle');

const RECURRENCE_SELECT = `
  id, account_id, category_id, type, amount, note, mode, cycle,
  start_date, end_date, occurrences_total, occurrences_completed,
  auto_post, next_due_date, pending_confirmation, pending_due_date, archived_at,
  created_at, updated_at,
  account:accounts(id, name, type, emoji),
  category:categories(id, name, type, color, icon)
`;

const flattenRecurrence = (r) => ({
  id: r.id,
  account_id: r.account_id,
  category_id: r.category_id,
  account_name: r.account?.name || null,
  account_emoji: r.account?.emoji || null,
  category_name: r.category?.name || null,
  category_color: r.category?.color || null,
  category_icon: r.category?.icon || null,
  type: r.type,
  amount: r.amount,
  note: r.note,
  mode: r.mode,
  cycle: r.cycle,
  start_date: r.start_date,
  end_date: r.end_date,
  occurrences_total: r.occurrences_total,
  occurrences_completed: r.occurrences_completed,
  auto_post: r.auto_post,
  next_due_date: r.next_due_date,
  pending_confirmation: r.pending_confirmation,
  pending_due_date: r.pending_due_date,
  archived_at: r.archived_at,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

const getRecurrences = async (filters = {}) => {
  let query = supabase.from('recurrences').select(RECURRENCE_SELECT);

  if (filters.archived === true) {
    query = query.not('archived_at', 'is', null);
  } else if (filters.archived !== 'all') {
    // Default: active only
    query = query.is('archived_at', null);
  }

  const { data, error } = await query.order('next_due_date', { ascending: true });
  if (error) throw error;
  return data.map(flattenRecurrence);
};

const getRecurrenceById = async (id) => {
  const { data, error } = await supabase
    .from('recurrences')
    .select(RECURRENCE_SELECT)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return flattenRecurrence(data);
};

const createRecurrence = async (payload) => {
  const {
    account_id, category_id, type, amount, note, mode, cycle,
    start_date, end_date, occurrences_total, auto_post,
  } = payload;

  const insert = {
    account_id, category_id, type, amount,
    note: note || null,
    mode, cycle, start_date,
    occurrences_total: mode === 'installment' ? occurrences_total : null,
    occurrences_completed: 0,
    auto_post: auto_post !== undefined ? auto_post : true,
    next_due_date: start_date,
    pending_confirmation: false,
    pending_due_date: null,
    end_date: mode === 'subscription' ? (end_date || null) : null,
  };

  if (mode === 'installment') {
    insert.end_date = computeInstallmentEndDate({ cycle, start_date, occurrences_total });
  }

  const { data, error } = await supabase
    .from('recurrences')
    .insert(insert)
    .select(RECURRENCE_SELECT)
    .single();

  if (error) throw error;
  return flattenRecurrence(data);
};

const updateRecurrence = async (id, payload) => {
  const existing = await getRecurrenceById(id);
  if (!existing) return null;

  const merged = { ...existing, ...payload };
  const update = {
    account_id: merged.account_id,
    category_id: merged.category_id,
    type: merged.type,
    amount: merged.amount,
    note: merged.note || null,
    mode: merged.mode,
    cycle: merged.cycle,
    start_date: merged.start_date,
    auto_post: merged.auto_post,
    updated_at: new Date().toISOString(),
  };

  if (merged.mode === 'installment') {
    update.occurrences_total = merged.occurrences_total;
    // Recompute end_date whenever occurrences_total (or start_date/cycle) may have changed
    update.end_date = computeInstallmentEndDate({
      cycle: merged.cycle, start_date: merged.start_date, occurrences_total: merged.occurrences_total,
    });
  } else {
    update.occurrences_total = null;
    update.end_date = merged.mode === 'subscription' ? (merged.end_date || null) : null;
  }

  const { data, error } = await supabase
    .from('recurrences')
    .update(update)
    .eq('id', id)
    .select(RECURRENCE_SELECT)
    .single();

  if (error) throw error;
  return flattenRecurrence(data);
};

const deleteRecurrence = async (id) => {
  const { count, error: countError } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('recurrence_id', id);

  if (countError) throw countError;

  if (count > 0) {
    const err = new Error('Cannot delete a recurrence with posted entries — archive it instead.');
    err.code = 'HAS_ENTRIES';
    err.status = 409;
    throw err;
  }

  const { data, error } = await supabase
    .from('recurrences')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return data ? { id: data.id } : null;
};

const archiveRecurrence = async (id, extra = {}) => {
  const { data, error } = await supabase
    .from('recurrences')
    .update({ ...extra, archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(RECURRENCE_SELECT)
    .maybeSingle();

  if (error) throw error;
  return data ? flattenRecurrence(data) : null;
};

const restoreRecurrence = async (id) => {
  const existing = await getRecurrenceById(id);
  if (!existing) return null;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (existing.mode === 'installment' && existing.occurrences_completed >= existing.occurrences_total) {
    const err = new Error('This installment is already complete — nothing left to restore.');
    err.code = 'INSTALLMENT_COMPLETE';
    err.status = 409;
    throw err;
  }
  // Same reasoning as the installment case: a subscription whose end_date
  // has already passed archived because it naturally ran its course, not
  // because the user paused it — restoring it with a fresh next_due_date
  // but a stale, already-past end_date would let it fire exactly one more
  // entry before immediately re-archiving on the very next cron sweep.
  if (existing.mode === 'subscription' && existing.end_date && existing.end_date < todayStr) {
    const err = new Error('This subscription already ended — nothing left to restore.');
    err.code = 'SUBSCRIPTION_ENDED';
    err.status = 409;
    throw err;
  }

  // Recompute next_due_date from today forward rather than resuming the
  // stale frozen value — otherwise a long-paused recurrence would fire a
  // burst of "overdue" postings on the next cron sweep.
  const nextDue = computeNextDueDate({ cycle: existing.cycle, start_date: existing.start_date, next_due_date: todayStr });

  const { data, error } = await supabase
    .from('recurrences')
    .update({ archived_at: null, next_due_date: nextDue, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(RECURRENCE_SELECT)
    .single();

  if (error) throw error;
  return flattenRecurrence(data);
};

const getDueRecurrences = async () => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('recurrences')
    .select(RECURRENCE_SELECT)
    .is('archived_at', null)
    .lte('next_due_date', todayStr);

  if (error) throw error;
  return data.map(flattenRecurrence);
};

// Intentionally does NOT filter on archived_at — a completed installment's
// final occurrence can still be awaiting confirmation after the recurrence
// itself has archived (see the note on advanceRecurrenceSchedule above).
const getPendingConfirmationRecurrences = async () => {
  const { data, error } = await supabase
    .from('recurrences')
    .select(RECURRENCE_SELECT)
    .eq('pending_confirmation', true);

  if (error) throw error;
  return data.map(flattenRecurrence);
};

// Advances a due recurrence's schedule state (occurrence count / next_due_date
// / archival). Does NOT create the entry — caller (processRecurrences /
// confirmRecurrence) handles that separately.
// NOTE: archival here must NOT touch pending_confirmation/pending_due_date —
// this runs immediately after processRecurrences may have just set them for
// the final occurrence (e.g. an installment's last payment, auto_post=false).
// That final confirmation must still be resolvable after the recurrence
// archives; clearing the flag here would silently drop it. See design §7.
const advanceRecurrenceSchedule = async (r) => {
  if (r.mode === 'installment') {
    const completed = r.occurrences_completed + 1;
    if (completed >= r.occurrences_total) {
      return archiveRecurrence(r.id, { occurrences_completed: completed });
    }
    return updateRecurrenceInternal(r.id, {
      occurrences_completed: completed,
      next_due_date: computeNextDueDate(r),
    });
  }

  if (r.mode === 'subscription' && r.end_date && r.next_due_date >= r.end_date) {
    return archiveRecurrence(r.id, {});
  }

  return updateRecurrenceInternal(r.id, { next_due_date: computeNextDueDate(r) });
};

// Internal-only partial update, bypasses updateRecurrence's full-field merge
// (used by the schedule-advancement path, which only ever touches a couple
// of scheduling columns, not the whole recurrence shape).
const updateRecurrenceInternal = async (id, fields) => {
  const { data, error } = await supabase
    .from('recurrences')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(RECURRENCE_SELECT)
    .single();

  if (error) throw error;
  return flattenRecurrence(data);
};

// The cron-triggered sweep (POST /api/recurrences/process). For each due,
// non-archived recurrence: auto-post creates the real entry immediately;
// confirm-mode sets pending_confirmation instead. Either way, the schedule
// (next_due_date / occurrences_completed / archival) advances immediately —
// it does not wait for user confirmation (see design §4.2 rationale).
const processRecurrences = async () => {
  const due = await getDueRecurrences();
  let posted = 0;
  let pendingConfirm = 0;

  for (const r of due) {
    if (r.auto_post) {
      await createEntry(
        { type: r.type, amount: r.amount, account_id: r.account_id, category_id: r.category_id, note: r.note, date: r.next_due_date },
        { recurrenceId: r.id }
      );
      posted += 1;
      await advanceRecurrenceSchedule(r);
    } else {
      await updateRecurrenceInternal(r.id, { pending_confirmation: true, pending_due_date: r.next_due_date });
      pendingConfirm += 1;
      await advanceRecurrenceSchedule(r);
    }
  }

  return { posted, pendingConfirm };
};

// POST /api/recurrences/:id/confirm — posts a real entry for a pending
// (auto_post = false) recurrence and clears pending_confirmation.
const confirmRecurrence = async (id) => {
  const r = await getRecurrenceById(id);
  if (!r) return null;
  if (!r.pending_confirmation) {
    const err = new Error('This recurrence has no pending confirmation.');
    err.code = 'NOT_PENDING';
    err.status = 409;
    throw err;
  }

  const entry = await createEntry(
    { type: r.type, amount: r.amount, account_id: r.account_id, category_id: r.category_id, note: r.note, date: r.pending_due_date },
    { recurrenceId: r.id }
  );
  await updateRecurrenceInternal(r.id, { pending_confirmation: false, pending_due_date: null });
  return entry;
};

// ── Calendar + Tags queries (US-08 + US-14, v2.5) ─────────────────────

// US-08: Per-day aggregated totals for a calendar month (design §A.3.2).
// Copies the design's exact implementation — JS aggregation over a bounded
// month of entries, zero-filling all days, excluding transfers and soft-deleted entries.
const getCalendarMonth = async (month) => {
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate(); // mon is 1-based; day 0 of next month = last day of this month

  // Build all dates in the month for zero-fill
  const allDates = [];
  for (let d = 1; d <= daysInMonth; d++) {
    allDates.push(`${month}-${String(d).padStart(2, '0')}`);
  }

  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('entries')
    .select('date, type, amount, transfer_group_id')
    .is('deleted_at', null)
    .is('transfer_group_id', null)   // exclude transfers
    .gte('date', from)
    .lte('date', to);

  if (error) throw error;

  // Aggregate in JS — the row count for one month is bounded (~31 days × maybe 20 entries/day = 620 rows max),
  // so a JS reduce is simpler and more readable than a raw SQL GROUP BY via supabase-js.
  // This mirrors the existing pattern in getDashboardMoM which also aggregates in JS after fetching.
  const dayMap = {};
  for (const entry of data) {
    if (!dayMap[entry.date]) {
      dayMap[entry.date] = { total_income: 0, total_expense: 0 };
    }
    if (entry.type === 'income') {
      dayMap[entry.date].total_income += entry.amount;
    } else {
      dayMap[entry.date].total_expense += entry.amount;
    }
  }

  // Zero-fill all dates
  const days = allDates.map(date => ({
    date,
    total_income: dayMap[date]?.total_income || 0,
    total_expense: dayMap[date]?.total_expense || 0,
    net: (dayMap[date]?.total_income || 0) - (dayMap[date]?.total_expense || 0),
  }));

  return { month, days };
};

// US-14: List all tags, optional prefix filter for autocomplete (design §B.3.1).
const getTags = async (q) => {
  let query = supabase
    .from('tags')
    .select('id, name, created_at')
    .order('name_lower', { ascending: true });

  if (q) {
    // Prefix filter on name_lower — case-insensitive matching per design §B.2.1
    query = query.ilike('name_lower', `${q.toLowerCase()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return { tags: data };
};

// US-14: Idempotent tag creation (design §B.3.1). If a tag with the same
// name_lower already exists, return it (200). Otherwise create a new one (201).
// Returns { tag, created } where created is true/false.
const createTag = async (name) => {
  const name_lower = name.toLowerCase();

  // Check if tag already exists
  const { data: existing, error: checkError } = await supabase
    .from('tags')
    .select('id, name, created_at')
    .eq('name_lower', name_lower)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existing) {
    return { tag: existing, created: false };
  }

  const { data, error } = await supabase
    .from('tags')
    .insert({ name, name_lower })
    .select('id, name, created_at')
    .single();

  if (error) {
    // Race condition: unique constraint violation — another request created
    // the same tag between our check and insert. Retry as a fetch.
    if (error.code === '23505') {
      const { data: existing2, error: checkError2 } = await supabase
        .from('tags')
        .select('id, name, created_at')
        .eq('name_lower', name_lower)
        .maybeSingle();
      if (checkError2) throw checkError2;
      return { tag: existing2, created: false };
    }
    throw error;
  }

  return { tag: data, created: true };
};

// US-14: Hard-delete a tag (cascades to entry_tags via FK ON DELETE CASCADE).
const deleteTag = async (id) => {
  const { data, error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return data; // null if not found
};

// US-14: Tag-filtered spending report (design §B.3.3).
// NOTE: Uses .is('entries.deleted_at', null) NOT .eq() — .eq(col, null)
// never matches NULL in PostgREST (translates to SQL `= NULL` which is
// always false). This was a real bug caught during design review; the
// corrected version is in the design doc and must not be reverted.
const getTagsReport = async (from, to) => {
  // Fetch entry_tags joined with entries and tags, filtered by date range
  let query = supabase
    .from('entry_tags')
    .select(`
      tag_id,
      tags!inner(id, name),
      entries!inner(amount)
    `)
    .is('entries.deleted_at', null)  // CORRECTED during review: .eq(col, null) never matches
                                      // NULL in Supabase-js/PostgREST (translates to SQL `= NULL`,
                                      // which is always false) — .is() is required for NULL checks.
                                      // This matches getCalendarMonth's own .is('deleted_at', null)
                                      // two sections earlier in this same document; the original
                                      // draft here was inconsistent with it.
    .is('entries.transfer_group_id', null);  // exclude transfers

  if (from) query = query.gte('entries.date', from);
  if (to) query = query.lte('entries.date', to);

  const { data, error } = await query;
  if (error) throw error;

  // Aggregate by tag (JS reduce, same pattern as getExpenseBreakdown)
  const tagMap = {};
  for (const row of data) {
    const tagId = row.tag_id;
    if (!tagMap[tagId]) {
      tagMap[tagId] = {
        id: tagId,
        name: row.tags.name,
        total_amount: 0,
        entry_count: 0,
      };
    }
    tagMap[tagId].total_amount += row.entries.amount;
    tagMap[tagId].entry_count += 1;
  }

  return Object.values(tagMap).sort((a, b) => b.total_amount - a.total_amount);
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

  // App events (US-27)
  logAppEvent,

  // Recycle Bin functions
  getRecycleBin,
  restoreItem,
  purgeExpired,

  // Recurrence queries (US-16, v2.3)
  getRecurrences,
  getRecurrenceById,
  createRecurrence,
  updateRecurrence,
  deleteRecurrence,
  archiveRecurrence,
  restoreRecurrence,
  getDueRecurrences,
  getPendingConfirmationRecurrences,
  processRecurrences,
  confirmRecurrence,

  // Calendar + Tags queries (US-08 + US-14, v2.5)
  getCalendarMonth,
  getTags,
  createTag,
  deleteTag,
  getTagsReport
};