import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  userId: string;
  biographyId: string | null;
  setUserId: (id: string) => void;
  setBiographyId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userId: '',
      biographyId: null,
      setUserId: (id) => set({ userId: id }),
      setBiographyId: (id) => set({ biographyId: id }),
    }),
    { name: 'bibig-app' },
  ),
);
