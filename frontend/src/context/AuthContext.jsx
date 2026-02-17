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
      console.log('Sending registration request to:', `${API_BASE}/api/auth/register`);
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
      console.log('Registration response:', response.data);
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Registration error:', error.response?.data?.message || error.message);
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const login = async (username, password) => {
    try {
      console.log('Sending login request to:', `${API_BASE}/api/auth/login`);
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
      console.log('Login response:', response.data);
      localStorage.setItem('token', response.data.token);
      setIsLoggedIn(true);
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      console.error('Login error:', error.response?.data?.message || error.message);
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = () => {
    console.log('Logging out user');
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('token');
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, register, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};