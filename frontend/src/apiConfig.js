// Central API configuration for frontend
// In production (Render), set VITE_API_BASE_URL to your backend URL.
// Locally it falls back to http://localhost:5000.

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const DEFAULT_AVATAR = `${API_BASE}/display/default.jpg`;

