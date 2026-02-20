// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import './App.css';
import Header from './components/Header';
import Home from './components/Home';
import Menu from './components/Menu';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import EditProfile from './components/EditProfile';
import ReviewPage from './components/ReviewPage';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App">
            <Header />
            <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/review/:menuSlug" element={<ReviewPage />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
          </Routes>
          <Footer />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;