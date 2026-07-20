// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';
import { apiClient } from '../apiClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const restoreUser = async () => {
      try {
        const response = await apiClient.get('/api/users/me');
        if (response.data?.user) {
          setUser(response.data.user);
          setIsLoggedIn(true);
        }
      } catch {
        setUser(null);
        setIsLoggedIn(false);
      } finally {
        setIsAuthLoading(false);
      }
    };
    restoreUser();
  }, []);

  const register = async (username, email, password, phone) => {
    try {
      const response = await apiClient.post(
        '/api/auth/register',
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
      const response = await apiClient.post(
        '/api/auth/resend-verification',
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
      const response = await apiClient.post(
        '/api/auth/login',
        {
          username,
          password
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      if (response.data?.mfaRequired) {
        return { success: false, mfaRequired: true };
      }
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

  const verifyMfaLogin = async ({ code, backupCode }) => {
    try {
      const response = await apiClient.post(
        '/api/auth/mfa/verify',
        { code, backupCode },
        { headers: { 'Content-Type': 'application/json' } },
      );
      setIsLoggedIn(true);
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      const data = error.response?.data || {};
      return {
        success: false,
        message: data.message || 'Verification failed',
        code: data.code,
      };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // Local logout must still complete when the server is unavailable.
    } finally {
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      isAuthLoading,
      user,
      register,
      login,
      verifyMfaLogin,
      logout,
      updateUser,
      resendVerification,
    }}>
      {children}
    </AuthContext.Provider>
  );
};