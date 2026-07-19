import { apiFetch, apiForm } from '../../apiClient';

const readError = async (response) => {
  try {
    const data = await response.json();
    return data.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const adminJson = async (path, options = {}) => {
  const response = await apiFetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
};

export const adminForm = async (path, formData, options = {}) => {
  const response = await apiForm(path, formData, options);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
};

export const buildAdminQuery = (values) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '' && value != null) params.set(key, String(value));
  });
  return params.toString();
};
