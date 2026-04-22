import { create } from "zustand";

interface AuthState {
  token: string | null;
  clinicId: number | null;
  setToken: (token: string, clinicId?: number | null) => void;
  clearToken: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("clinic_token"),
  clinicId: (() => { const v = localStorage.getItem("clinic_id"); return v ? parseInt(v, 10) : null; })(),
  setToken: (token: string, clinicId?: number | null) => {
    localStorage.setItem("clinic_token", token);
    if (clinicId != null) localStorage.setItem("clinic_id", String(clinicId));
    set({ token, clinicId: clinicId ?? null });
  },
  clearToken: () => {
    localStorage.removeItem("clinic_token");
    localStorage.removeItem("clinic_id");
    set({ token: null, clinicId: null });
  },
}));
