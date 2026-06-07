import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeId = 'ink' | 'paper' | 'star';

interface ThemeState {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'ink',
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
    }),
    {
      name: 'bibig-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    },
  ),
);

export function initTheme() {
  const stored = localStorage.getItem('bibig-theme');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const theme = (parsed?.state?.theme as ThemeId) || 'ink';
      document.documentElement.setAttribute('data-theme', theme);
    } catch {
      document.documentElement.setAttribute('data-theme', 'ink');
    }
  } else {
    document.documentElement.setAttribute('data-theme', 'ink');
  }
}
