import { useContext } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, AuthProvider } from './AuthContext';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const SessionProbe = () => {
  const { isLoggedIn, user, login, logout } = useContext(AuthContext);

  return (
    <>
      <span data-testid="session">{isLoggedIn ? user?.username : 'anonymous'}</span>
      <button type="button" onClick={() => login('new-user', 'secret')}>Login</button>
      <button type="button" onClick={() => logout().catch(() => {})}>Logout</button>
    </>
  );
};

describe('AuthProvider cookie session lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores a session from /api/users/me without local storage gating', async () => {
    apiClient.get.mockResolvedValue({ data: { user: { id: '1', username: 'restored' } } });

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('restored'));
    expect(apiClient.get).toHaveBeenCalledWith('/api/users/me');
  });

  it('logs in from the response user without persisting a token', async () => {
    apiClient.get.mockRejectedValue({ response: { status: 401 } });
    apiClient.post.mockResolvedValue({
      data: { token: 'ignored-token', user: { id: '2', username: 'new-user' } },
    });
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('new-user'));
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/auth/login',
      { username: 'new-user', password: 'secret' },
      { headers: { 'Content-Type': 'application/json' } },
    );
    expect(storageSpy).not.toHaveBeenCalled();
    storageSpy.mockRestore();
  });

  it('posts logout and clears local auth state even when the request fails', async () => {
    apiClient.get.mockResolvedValue({ data: { user: { id: '1', username: 'restored' } } });
    apiClient.post.mockRejectedValue(new Error('network down'));

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );
    await screen.findByText('restored');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    });

    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('anonymous'));
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout');
  });
});
