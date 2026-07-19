import axios from 'axios';
import { API_BASE } from './apiConfig';

const absoluteUrlPattern = /^[a-z][a-z\d+\-.]*:\/\//i;

export const resolveApiUrl = (input) => {
  if (typeof input !== 'string' || absoluteUrlPattern.test(input)) {
    return input;
  }

  return `${API_BASE}${input.startsWith('/') ? input : `/${input}`}`;
};

export const apiFetch = (input, init = {}) =>
  fetch(resolveApiUrl(input), {
    ...init,
    credentials: 'include',
  });

export const apiJson = (input, { body, headers, ...init } = {}) => {
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  return apiFetch(input, {
    ...init,
    headers: requestHeaders,
    body: body == null || typeof body === 'string' ? body : JSON.stringify(body),
  });
};

export const apiForm = (input, formData, init = {}) =>
  apiFetch(input, {
    ...init,
    body: formData,
  });

export const apiStream = (input, init = {}) => apiFetch(input, init);

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});
