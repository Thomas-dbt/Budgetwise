import "./globals.css"
import type { ReactNode } from "react"
import { AuthProvider } from "@/components/auth-provider"
import { AppShell } from "@/components/app-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { ToastProvider } from "@/components/toast"
import { ThemeInitScript } from "@/components/theme-init-script"

export const metadata = {
  title: 'BudgetWise',
  description: 'Gestion financière personnelle et familiale'
}

import { PinProvider } from "@/lib/pin-context"
import PinLock from "@/components/pin-lock"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <PinProvider>
                <PinLock />
                <AppShell>{children}</AppShell>
              </PinProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


