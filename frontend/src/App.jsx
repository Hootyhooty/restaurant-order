// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Profile from './components/Profile';
import EditProfile from './components/EditProfile';
import ReviewPage from './components/ReviewPage';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';
import ScrollToTop from './components/ScrollToTop';
import Booking from './components/Booking';
import BookingPaymentSuccess from './components/BookingPaymentSuccess';
import BookingPaymentCancel from './components/BookingPaymentCancel';

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
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/admin" element={<AdminDashboard />} />
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