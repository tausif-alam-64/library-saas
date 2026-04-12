// stores/useUIStore.js

import { create } from 'zustand'

const useUIStore = create((set) => ({
  // Toast notifications
  // Each toast: { id, message, type: 'success' | 'error' | 'info' }
  toasts: [],

  addToast: (message, type = 'success') => {
    const id = Date.now()
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }))
    // Auto-remove after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, 4000)
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  // Confirm dialog
  // confirm: null when hidden, or { message, description, onConfirm, onCancel, danger }
  confirm: null,

  // Show a confirmation dialog before a destructive action
  // Usage: showConfirm({ message: 'Mark inactive?', onConfirm: () => doTheThing() })
  showConfirm: ({ message, description = null, onConfirm, onCancel = null, danger = true }) => {
    set({
      confirm: { message, description, onConfirm, onCancel, danger },
    })
  },

  hideConfirm: () => set({ confirm: null }),
}))

export default useUIStore