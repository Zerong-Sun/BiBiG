import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureDemoUser, login, logout as apiLogout } from '../services/api';
import { ensureOfflineUser } from '../utils/offlineStore';
import { useAppStore } from './useAppStore';

const PASSWORD_KEY = 'bibig-password';

export function useAuth() {
  const navigate = useNavigate();
  const { offlineMode, setUserId, setUserName, setUserEmail, setAuthenticated, clearAuth, setOfflineMode } =
    useAppStore();

  const restoreSession = useCallback(async (): Promise<string | null> => {
    if (offlineMode) {
      const id = await ensureOfflineUser();
      setUserId(id);
      setUserName('本地用户');
      setAuthenticated(true);
      return id;
    }

    const token = localStorage.getItem('bibig-auth-token');
    const email = localStorage.getItem('bibig-user-email');
    const password = localStorage.getItem(PASSWORD_KEY);

    if (token && email && password) {
      try {
        const user = await login(email, password);
        setUserId(user.id);
        setUserName(user.name);
        setUserEmail(email);
        setAuthenticated(true);
        return user.id;
      } catch {
        apiLogout();
        clearAuth();
      }
    }

    const storedId = localStorage.getItem('bibig-user-id');
    if (storedId && token) {
      setUserId(storedId);
      setAuthenticated(true);
      return storedId;
    }

    return null;
  }, [offlineMode, setUserId, setUserName, setUserEmail, setAuthenticated, clearAuth]);

  const requireAuth = useCallback(async (): Promise<string> => {
    if (offlineMode) {
      const id = await ensureOfflineUser();
      setUserId(id);
      setAuthenticated(true);
      return id;
    }
    const id = await restoreSession();
    if (id) return id;
    navigate('/login');
    throw new Error('未登录');
  }, [offlineMode, restoreSession, navigate, setUserId, setAuthenticated]);

  const startOffline = useCallback(async (): Promise<string> => {
    setOfflineMode(true);
    const id = await ensureOfflineUser();
    setUserId(id);
    setUserName('本地用户');
    setAuthenticated(true);
    return id;
  }, [setOfflineMode, setUserId, setUserName, setAuthenticated]);

  const startDemo = useCallback(async (): Promise<string> => {
    setOfflineMode(false);
    const id = await ensureDemoUser();
    localStorage.setItem(PASSWORD_KEY, 'demo123');
    setUserId(id);
    setUserName('演示用户');
    setAuthenticated(true);
    return id;
  }, [setOfflineMode, setUserId, setUserName, setAuthenticated]);

  const signOut = useCallback(() => {
    if (!offlineMode) apiLogout();
    clearAuth();
    navigate('/login');
  }, [offlineMode, clearAuth, navigate]);

  return { restoreSession, requireAuth, startOffline, startDemo, signOut };
}
