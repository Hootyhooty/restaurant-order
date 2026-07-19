import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, apiForm, apiJson, apiStream } from './apiClient';

describe('credentialed API transport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes credentials for regular and streaming fetches', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await apiFetch('/api/example', { method: 'GET' });
    await apiStream('/api/kitchen/stream', { signal: controller.signal });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:5000/api/example',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:5000/api/kitchen/stream',
      expect.objectContaining({ credentials: 'include', signal: controller.signal }),
    );
  });

  it('serializes JSON and leaves FormData headers to the browser', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const formData = new FormData();
    formData.append('name', 'menu');

    await apiJson('/api/json', { method: 'POST', body: { value: 1 } });
    await apiForm('/api/form', formData, { method: 'POST' });

    const jsonInit = fetchMock.mock.calls[0][1];
    expect(jsonInit.body).toBe('{"value":1}');
    expect(jsonInit.headers.get('Content-Type')).toBe('application/json');
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({ body: formData, credentials: 'include' }),
    );
    expect(fetchMock.mock.calls[1][1].headers).toBeUndefined();
  });
});
