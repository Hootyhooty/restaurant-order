// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import './App.css';
import Header from './components/Header';
import Home from './components/Home';
import Menu from './components/Menu';
import Store from './components/Store';
import Login from './components/Login';
import Register from './components/Register';
import VerifyEmail from './components/VerifyEmail';
import VerifyPending from './components/VerifyPending';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Profile from './components/Profile';
import EditProfile from './components/EditProfile';
import ReviewPage from './components/ReviewPage';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import Contact from './components/Contact';
import About from './components/About';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';
import ScrollToTop from './components/ScrollToTop';
import Booking from './components/Booking';
import BookingPaymentSuccess from './components/BookingPaymentSuccess';
import BookingPaymentCancel from './components/BookingPaymentCancel';
import StaffLayout from './pages/staff/StaffLayout';
import StaffBookings from './pages/staff/StaffBookings';
import StaffOrder from './pages/staff/StaffOrder';
import StaffStatus from './pages/staff/StaffStatus';
import KitchenLayout from './pages/kitchen/KitchenLayout';
import KitchenQueue from './pages/kitchen/KitchenQueue';
import KitchenReservations from './pages/kitchen/KitchenReservations';
import KitchenStock from './pages/kitchen/KitchenStock';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App">
            <Header />
            <ScrollToTop />
          <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/store" element={<Store />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify-pending" element={<VerifyPending />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/staff" element={<StaffLayout />}>
              <Route index element={<Navigate to="/staff/bookings" replace />} />
              <Route path="bookings" element={<StaffBookings />} />
              <Route path="order" element={<StaffOrder />} />
              <Route path="status" element={<StaffStatus />} />
            </Route>
            <Route path="/kitchen" element={<KitchenLayout />}>
              <Route index element={<Navigate to="/kitchen/queue" replace />} />
              <Route path="queue" element={<KitchenQueue />} />
              <Route path="reservations" element={<KitchenReservations />} />
              <Route path="stock" element={<KitchenStock />} />
            </Route>
            <Route path="/review/:menuSlug" element={<ReviewPage />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/booking/payment/success" element={<BookingPaymentSuccess />} />
            <Route path="/booking/payment/cancel" element={<BookingPaymentCancel />} />
          </Routes>
          </main>
          <Footer />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;