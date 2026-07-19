import { useContext, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './KitchenLayout.css';

const KitchenLayout = () => {
  const { user, logout, isAuthLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user || user.role !== 'KITCHEN') {
      navigate('/');
    }
  }, [isAuthLoading, user, navigate]);

  if (isAuthLoading || !user || user.role !== 'KITCHEN') {
    return null;
  }

  return (
    <section className="kitchen-layout">
      <div className="container-fluid">
        <header className="kitchen-header">
          <div className="kitchen-header-info">
            <h1 className="kitchen-header-title">Kitchen Dashboard</h1>
            <p className="kitchen-header-user">
              Signed in as <strong>{user.username}</strong>
            </p>
          </div>
          <button
            type="button"
            className="kitchen-header-logout"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            Logout
          </button>
        </header>

        <nav className="kitchen-nav" aria-label="Kitchen sections">
          <NavLink
            to="/kitchen/queue"
            className={({ isActive }) =>
              `kitchen-nav-tab${isActive ? ' kitchen-nav-tab--active' : ''}`
            }
            end
          >
            Queue
          </NavLink>
          <NavLink
            to="/kitchen/reservations"
            className={({ isActive }) =>
              `kitchen-nav-tab${isActive ? ' kitchen-nav-tab--active' : ''}`
            }
          >
            Reservations
          </NavLink>
          <NavLink
            to="/kitchen/stock"
            className={({ isActive }) =>
              `kitchen-nav-tab${isActive ? ' kitchen-nav-tab--active' : ''}`
            }
          >
            Stock
          </NavLink>
        </nav>

        <div className="kitchen-content">
          <Outlet />
        </div>
      </div>
    </section>
  );
};

export default KitchenLayout;
