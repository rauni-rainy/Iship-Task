import { create } from 'zustand';
import { User } from '@shared/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  hydrateFromServer: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // starts loading until hydration completes
  isHydrated: false,
  setUser: (user) => set({ user, isLoading: false, isHydrated: true }),
  clearUser: () => set({ user: null, isLoading: false, isHydrated: true }),
  hydrateFromServer: (user) => set({ user, isLoading: false, isHydrated: true }),
}));
