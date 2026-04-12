// stores/useAppStore.js

import { create } from 'zustand'

const useAppStore = create((set, get) => ({
  // The currently logged-in partner
  // { id, name, role, library_id }
  partner: null,

  // The library this partner belongs to
  // { id, name, grace_period_days, morning_cutoff_time, no_show_days, plan }
  library: null,

  // Set both partner and library at login
  // Called once from the (app) layout after the session is confirmed
  setSession: (partner, library) => set({ partner, library }),

  // Clear everything on logout
  clearSession: () => set({ partner: null, library: null }),

  // Convenience getter — avoids repeating role checks across components
  isPrimary: () => get().partner?.role === 'primary',

  // Convenience getter — grace period from library settings
  gracePeriodDays: () => get().library?.grace_period_days ?? 10,
}))

export default useAppStore