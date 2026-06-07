import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  userId: string;
  userName: string;
  userEmail: string;
  biographyId: string | null;
  isAuthenticated: boolean;
  offlineMode: boolean;
  setUserId: (id: string) => void;
  setUserName: (name: string) => void;
  setUserEmail: (email: string) => void;
  setBiographyId: (id: string | null) => void;
  setAuthenticated: (value: boolean) => void;
  setOfflineMode: (value: boolean) => void;
  clearAuth: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userId: '',
      userName: '本地用户',
      userEmail: '',
      biographyId: null,
      isAuthenticated: false,
      offlineMode: false,
      setUserId: (id) => set({ userId: id }),
      setUserName: (name) => set({ userName: name }),
      setUserEmail: (email) => set({ userEmail: email }),
      setBiographyId: (id) => set({ biographyId: id }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setOfflineMode: (value) => set({ offlineMode: value }),
      clearAuth: () =>
        set({ userId: '', userName: '', userEmail: '', isAuthenticated: false }),
    }),
    { name: 'bibig-app' },
  ),
);

export function isOfflineMode(): boolean {
  try {
    const raw = localStorage.getItem('bibig-app');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.offlineMode === true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
