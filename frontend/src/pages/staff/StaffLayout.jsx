import { useContext, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './StaffLayout.css';

const StaffLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'STAFF') {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'STAFF') {
    return null;
  }

  return (
    <section className="staff-layout">
      <div className="container-fluid">
        <header className="staff-header">
          <div className="staff-header-info">
            <h1 className="staff-header-title">Staff Dashboard</h1>
            <p className="staff-header-user">
              Signed in as <strong>{user.username}</strong>
            </p>
          </div>
          <button
            type="button"
            className="staff-header-logout"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Logout
          </button>
        </header>

        <nav className="staff-nav" aria-label="Staff sections">
          <NavLink
            to="/staff/bookings"
            className={({ isActive }) =>
              `staff-nav-tab${isActive ? ' staff-nav-tab--active' : ''}`
            }
          >
            Bookings
          </NavLink>
          <NavLink
            to="/staff/order"
            className={({ isActive }) =>
              `staff-nav-tab${isActive ? ' staff-nav-tab--active' : ''}`
            }
          >
            Order
          </NavLink>
          <NavLink
            to="/staff/status"
            className={({ isActive }) =>
              `staff-nav-tab${isActive ? ' staff-nav-tab--active' : ''}`
            }
          >
            Status
          </NavLink>
        </nav>

        <div className="staff-content">
          <Outlet />
        </div>
      </div>
    </section>
  );
};

export default StaffLayout;
