const API_BASE = '/api';

const parseErrorMessage = (error, fallback) => {
  if (!error) return fallback;
  // Direct string error
  if (typeof error.error === 'string') return error.error;
  // Structured error: { code, message, details }
  if (error.error && typeof error.error === 'object') {
    if (typeof error.error.message === 'string') return error.error.message;
    if (error.error.details && Array.isArray(error.error.details)) {
      return error.error.details.map(d => d.message || d.path?.join('.') || '').join('; ');
    }
  }
  // Fallback: try to stringify the whole thing safely
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
};

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    // Send cookies (httpOnly) with every request
    credentials: 'include',
  };

  let response = await fetch(url, config);

  // If 401 with TOKEN_EXPIRED, attempt refresh and retry once (FR-A8)
  if (response.status === 401) {
    const body = await response.json().catch(() => ({}));
    if (body.error?.code === 'TOKEN_EXPIRED') {
      // Attempt refresh
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        // Small delay to let the browser process Set-Cookie headers
        // from the refresh response before retrying.
        await new Promise(r => setTimeout(r, 50));
        // Retry the original request
        response = await fetch(url, config);
      }
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(parseErrorMessage(error, `HTTP error! status: ${response.status}`));
  }

  if (response.status === 204) return null;
  return response.json();
};

// Downloads a file response (e.g. CSV export) by streaming it to a real browser download
const downloadFile = async (endpoint) => {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(parseErrorMessage(error, `HTTP error! status: ${response.status}`));
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : 'export.csv';

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};

// Account API
export const getAccounts = (sort, order) => {
  const params = new URLSearchParams();
  if (sort) params.append('sort', sort);
  if (order) params.append('order', order);
  
  return apiRequest(`/accounts?${params}`);
};

export const getAccount = (id) => {
  return apiRequest(`/accounts/${id}`);
};

export const createAccount = (accountData) => {
  return apiRequest('/accounts', {
    method: 'POST',
    body: JSON.stringify(accountData)
  });
};

export const updateAccount = (id, accountData) => {
  return apiRequest(`/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(accountData)
  });
};

export const deleteAccount = (id) => {
  return apiRequest(`/accounts/${id}`, {
    method: 'DELETE'
  });
};

// Category API
export const getCategories = (type) => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  
  return apiRequest(`/categories?${params}`);
};

export const getCategory = (id) => {
  return apiRequest(`/categories/${id}`);
};

export const createCategory = (categoryData) => {
  return apiRequest('/categories', {
    method: 'POST',
    body: JSON.stringify(categoryData)
  });
};

export const updateCategory = (id, categoryData) => {
  return apiRequest(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(categoryData)
  });
};

export const deleteCategory = (id) => {
  return apiRequest(`/categories/${id}`, {
    method: 'DELETE'
  });
};

// Entry API
export const getEntries = (filters = {}) => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });
  
  return apiRequest(`/entries?${params}`);
};

// Calendar API — per-day aggregated totals for a month
export const getCalendarMonth = (month) => apiRequest(`/entries/calendar?month=${month}`);

export const getEntry = (id) => {
  return apiRequest(`/entries/${id}`);
};

export const createEntry = (entryData) => {
  return apiRequest('/entries', {
    method: 'POST',
    body: JSON.stringify(entryData)
  });
};

export const updateEntry = (id, entryData) => {
  return apiRequest(`/entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entryData)
  });
};

export const deleteEntry = (id) => {
  return apiRequest(`/entries/${id}`, {
    method: 'DELETE'
  });
};

// Dashboard API
export const getDashboard = (from, to) => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  
  return apiRequest(`/dashboard?${params}`);
};

export const getDashboardMoM = (from, to) => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  
  return apiRequest(`/dashboard/mom?${params}`);
};

// Export API — triggers a real browser file download (backend returns text/csv, not JSON)
export const exportEntries = (params = {}) => {
  const search = new URLSearchParams();
  if (params.from) search.append('from', params.from);
  if (params.to) search.append('to', params.to);
  const qs = search.toString();
  return downloadFile(`/export/entries${qs ? `?${qs}` : ''}`);
};

export const exportAccounts = () => {
  return downloadFile('/export/accounts');
};

// System Status API
export const getSystemStatus = () => {
  return apiRequest('/status');
};

// Recycle Bin API
export const getRecycleBin = (params = {}) => {
  const search = new URLSearchParams();
  if (params.type) search.append('type', params.type);
  if (params.page) search.append('page', params.page);
  if (params.per_page) search.append('per_page', params.per_page);
  const qs = search.toString();
  return apiRequest(`/recycle-bin${qs ? `?${qs}` : ''}`);
};

export const restoreItem = (type, id) => {
  return apiRequest(`/recycle-bin/restore/${type}/${id}`, { method: 'POST' });
};

// Auth API
export const signIn = (email, password) => {
  return apiRequest('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
};

export const signUp = (email, password) => {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
};

export const signOut = () => {
  return apiRequest('/auth/signout', {
    method: 'POST'
  });
};

export const getAuthUser = () => {
  return apiRequest('/auth/me');
};

// Settings API
export const getSettings = () => {
  return apiRequest('/settings');
};

export const updateSettings = (settings) => {
  return apiRequest('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  });
};

// Transfer API
export const createTransfer = (data) => apiRequest('/transfers', { method: 'POST', body: JSON.stringify(data) });
export const updateTransfer = (transferGroupId, data) => apiRequest(`/transfers/${transferGroupId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTransfer = (transferGroupId) => apiRequest(`/transfers/${transferGroupId}`, { method: 'DELETE' });
export const getTransfer = (transferGroupId) => apiRequest(`/transfers/${transferGroupId}`);

// Budget API
export const getBudgets = (categoryId) => {
  const params = new URLSearchParams();
  if (categoryId) params.append('category_id', categoryId);
  return apiRequest(`/budgets?${params}`);
};
export const getBudget = (id) => apiRequest(`/budgets/${id}`);
export const createBudget = (data) => apiRequest('/budgets', { method: 'POST', body: JSON.stringify(data) });
export const updateBudget = (id, data) => apiRequest(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBudget = (id) => apiRequest(`/budgets/${id}`, { method: 'DELETE' });
export const getDashboardBudgets = () => apiRequest('/dashboard/budgets');

// Recurrence API
export const getRecurrences = (archived) => {
  const params = new URLSearchParams();
  if (archived) params.append('archived', 'true');
  return apiRequest(`/recurrences?${params}`);
};
export const getRecurrence = (id) => apiRequest(`/recurrences/${id}`);
export const createRecurrence = (data) => apiRequest('/recurrences', { method: 'POST', body: JSON.stringify(data) });
export const updateRecurrence = (id, data) => apiRequest(`/recurrences/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRecurrence = (id) => apiRequest(`/recurrences/${id}`, { method: 'DELETE' });
export const archiveRecurrence = (id) => apiRequest(`/recurrences/${id}/archive`, { method: 'POST' });
export const restoreRecurrence = (id) => apiRequest(`/recurrences/${id}/restore`, { method: 'POST' });
export const getDueRecurrences = () => apiRequest('/recurrences/due');
export const confirmRecurrence = (id) => apiRequest(`/recurrences/${id}/confirm`, { method: 'POST' });