import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, apiForm } from '../../apiClient';
import { adminForm, adminJson, buildAdminQuery } from './adminApi';

vi.mock('../../apiClient', () => ({
  apiFetch: vi.fn(),
  apiForm: vi.fn(),
}));

describe('admin transport helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the shared cookie-auth transport and JSON headers', async () => {
    apiFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ items: [] }) });
    await expect(adminJson('/api/admin/users')).resolves.toEqual({ items: [] });
    expect(apiFetch).toHaveBeenCalledWith('/api/admin/users', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('delegates multipart requests without forcing a content type', async () => {
    const formData = new FormData();
    apiForm.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ item: {} }) });
    await adminForm('/api/admin/menu-items', formData, { method: 'POST' });
    expect(apiForm).toHaveBeenCalledWith('/api/admin/menu-items', formData, { method: 'POST' });
  });

  it('omits empty query values', () => {
    expect(buildAdminQuery({ page: 2, q: '', action: null, limit: 20 })).toBe('page=2&limit=20');
  });
});
