import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user') || localStorage.getItem('ap_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || localStorage.getItem('ap_token') || null);
  useEffect(() => {
    if (token) {
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      localStorage.setItem('ap_token', token);
    } else {
      delete client.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      localStorage.removeItem('ap_token');
    }

    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('ap_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('ap_user');
    }
  }, [token, user]);

  const establishSession = (newToken, userData) => {
    client.defaults.headers.common.Authorization = `Bearer ${newToken}`;
    localStorage.setItem('token', newToken);
    localStorage.setItem('ap_token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('ap_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const login = async (email, password) => {
    const res = await client.post('/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    establishSession(newToken, userData);

    // Return userData directly to caller for instant synchronous redirection
    return userData;
  };

  const logout = async () => {
    try {
      await client.post('/logout');
    } catch {
      // Ignore network errors
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('ap_token');
    localStorage.removeItem('user');
    localStorage.removeItem('ap_user');
    delete client.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, establishSession }}>
      {children}
    </AuthContext.Provider>
  );
}
