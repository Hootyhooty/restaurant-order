// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../apiConfig';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const restoreUser = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data?.user) {
          setUser(response.data.user);
          setIsLoggedIn(true);
        }
      } catch (err) {
        localStorage.removeItem('token');
        setUser(null);
        setIsLoggedIn(false);
      }
    };
    restoreUser();
  }, []);

  const register = async (username, email, password, phone) => {
    try {
      const response = await axios.post(
        `${API_BASE}/api/auth/register`,
        {
          username,
          email,
          password,
          phone
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      return {
        success: true,
        message: response.data.message,
        emailSent: response.data.emailSent,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
        emailSent: error.response?.data?.emailSent,
      };
    }
  };

  const resendVerification = async (email) => {
    try {
      const response = await axios.post(
        `${API_BASE}/api/auth/resend-verification`,
        { email },
        { headers: { 'Content-Type': 'application/json' } },
      );
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Could not resend verification email',
      };
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(
        `${API_BASE}/api/auth/login`,
        {
          username,
          password
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      localStorage.setItem('token', response.data.token);
      setIsLoggedIn(true);
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      const data = error.response?.data || {};
      return {
        success: false,
        message: data.message || 'Login failed',
        code: data.code,
        email: data.email,
      };
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('token');
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, register, login, logout, updateUser, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
};