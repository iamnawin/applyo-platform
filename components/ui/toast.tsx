'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastVariant = 'default' | 'success' | 'error'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, variant: ToastVariant = 'default') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm shadow-lg border animate-in slide-in-from-bottom-2 ${
              t.variant === 'error' ? 'bg-destructive text-destructive-foreground border-destructive' :
              t.variant === 'success' ? 'bg-green-900/90 text-green-100 border-green-700' :
              'bg-popover text-popover-foreground border-border'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
