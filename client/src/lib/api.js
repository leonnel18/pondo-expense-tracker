const API_BASE = '/api';

// Only attached once the user actually unlocks the app with a real passphrase (see set-passphrase flow).
// Never hardcode a secret here — it would ship in the public JS bundle and defeat the feature.
const getStoredPassphrase = () => sessionStorage.getItem('pondo_passphrase') || null;

const buildHeaders = (extra = {}) => {
  const headers = { ...extra };
  const passphrase = getStoredPassphrase();
  if (passphrase) headers['X-App-Passphrase'] = passphrase;
  return headers;
};

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
    headers: buildHeaders({ 'Content-Type': 'application/json', ...(options.headers || {}) }),
  };

  const response = await fetch(url, config);

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
  const response = await fetch(url, { headers: buildHeaders() });

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

export const deleteAccount = (id, resolution) => {
  return apiRequest(`/accounts/${id}`, {
    method: 'DELETE',
    body: resolution ? JSON.stringify(resolution) : undefined
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

export const setupApp = (passphrase) => {
  return apiRequest('/setup', {
    method: 'POST',
    body: JSON.stringify(passphrase ? { passphrase } : {})
  });
};

// Settings API
export const getSettings = () => {
  return apiRequest('/settings');
};