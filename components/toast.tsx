"use client"

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react"

interface ToastMessage {
  id: string
  type: "success" | "error"
  message: string
}

interface ToastContextValue {
  toast: (message: string, type?: ToastMessage["type"]) => void
  dismiss: (id: string) => void
  messages: ToastMessage[]
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const toast = useCallback((message: string, type: ToastMessage["type"] = "success") => {
    const id = crypto.randomUUID()
    setMessages((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id))
    }, 5000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id))
  }, [])

  const value = useMemo(() => ({ toast, dismiss, messages }), [toast, dismiss, messages])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[1000] space-y-3 w-full max-w-sm">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-xl p-4 shadow-lg border text-sm ${
              msg.type === "success"
                ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
                : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <span>{msg.message}</span>
              <button onClick={() => dismiss(msg.id)} className="text-xs underline">
                Fermer
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}






