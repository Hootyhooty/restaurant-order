import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import { adminJson } from './admin/adminApi';

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('./admin/adminApi', () => ({ adminJson: vi.fn() }));
vi.mock('./admin/UsersSection', () => ({ default: () => <div>Users section content</div> }));
vi.mock('./admin/TransactionsSection', () => ({ default: () => <div>Transactions section content</div> }));
vi.mock('./admin/MenuSection', () => ({ default: () => <div>Menu section content</div> }));
vi.mock('./admin/SouvenirSection', () => ({ default: () => <div>Souvenir section content</div> }));
vi.mock('./admin/ReviewsSection', () => ({ default: () => <div>Reviews section content</div> }));
vi.mock('./admin/BookingsSection', () => ({ default: () => <div>Bookings section content</div> }));
vi.mock('./admin/AnalysisSection', () => ({ default: () => <div>Analysis section content</div> }));
vi.mock('./admin/AuditSection', () => ({ default: () => <div>Audit section content</div> }));
vi.mock('./AdminKitchenSection', () => ({ default: () => <div>Kitchen section content</div> }));
vi.mock('./AdminPromotionsSection', () => ({ default: () => <div>Promotions section content</div> }));

const renderDashboard = (user, isAuthLoading = false) => render(
  <MemoryRouter>
    <AuthContext.Provider value={{ user, isAuthLoading, logout: vi.fn() }}>
      <AdminDashboard />
    </AuthContext.Provider>
  </MemoryRouter>,
);

describe('AdminDashboard shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminJson.mockResolvedValue({ stats: { totalUsers: 4, activeUsers: 3, totalMenuItems: 8, totalSouvenirItems: 2 } });
  });

  it('redirects non-admin users without rendering admin navigation', () => {
    renderDashboard({ role: 'USER', username: 'guest' });
    expect(navigate).toHaveBeenCalledWith('/');
    expect(screen.queryByRole('button', { name: 'Users' })).not.toBeInTheDocument();
  });

  it('waits for cookie-session restoration before redirecting', () => {
    renderDashboard(null, true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('renders authorized tabs and switches domain sections', async () => {
    renderDashboard({ role: 'ADMIN', username: 'owner', email: 'owner@example.com', photo: '' });
    expect(screen.getByText('Users section content')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Transactions' }));
    expect(screen.getByText('Transactions section content')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Total Users: 4')).toBeInTheDocument());
    expect(adminJson).toHaveBeenCalledWith('/api/admin/stats');
  });
});
