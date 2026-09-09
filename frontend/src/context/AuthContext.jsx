import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // true pendant le check initial

  // Vérifier la session au démarrage via /api/auth/me
  const checkAuth = useCallback(async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // Rafraîchir l'access token toutes les 12 minutes (avant expiry 15min)
  useEffect(() => {
    if (!user) return;
    const id = setInterval(async () => {
      try {
        const data = await api.post('/auth/refresh');
        setUser(data.user);
      } catch {
        setUser(null);
      }
    }, 12 * 60 * 1000);
    return () => clearInterval(id);
  }, [user]);

  const login = async (credentials) => {
    const data = await api.post('/auth/login', credentials);
    setUser(data.user);
    return data.user;
  };

  const register = async (credentials) => {
    const data = await api.post('/auth/register', credentials);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
