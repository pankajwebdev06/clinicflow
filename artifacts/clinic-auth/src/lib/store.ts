import { create } from "zustand";

interface AuthState {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("clinic_token"),
  setToken: (token: string) => {
    localStorage.setItem("clinic_token", token);
    set({ token });
  },
  clearToken: () => {
    localStorage.removeItem("clinic_token");
    set({ token: null });
  },
}));
