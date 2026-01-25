'use client'

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getIdToken, onAuthStateChanged } from 'firebase/auth'
import { firebaseAuth } from '@/lib/firebase/client'

type FirebaseUser = any

type AuthContextValue = {
  user: FirebaseUser | null
  loading: boolean
  getToken: () => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  getToken: async () => null,
  signOut: async () => undefined,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth state change timeout - forcing loading false')
        setLoading(false)
      }
    }, 5000)

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser: FirebaseUser | null) => {
      // Session Expiry Check (30 Days)
      if (currentUser) {
        const pendingLogin = localStorage.getItem('budgetwise_login_pending')

        if (pendingLogin) {
          // Fresh login detected!
          localStorage.setItem('budgetwise_auth_date', Date.now().toString())
          localStorage.removeItem('budgetwise_login_pending')
        } else {
          const lastAuth = localStorage.getItem('budgetwise_auth_date')
          const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

          if (!lastAuth || (Date.now() - Number(lastAuth) > THIRTY_DAYS_MS)) {
            console.log('Session expired (30 days limit). forcing re-auth.')
            await firebaseAuth.signOut()
            localStorage.removeItem('budgetwise_auth_date')
            localStorage.removeItem(`budgetwise_pin_${currentUser.uid}`)
            if (mounted) {
              setUser(null)
              setLoading(false)
            }
            clearTimeout(timeout)
            return
          }
        }
      }

      if (mounted) {
        setUser(currentUser)
        setLoading(false)
      }
      clearTimeout(timeout)
    })

    return () => {
      mounted = false
      unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      getToken: async () => {
        if (!firebaseAuth.currentUser) return null
        return getIdToken(firebaseAuth.currentUser, true)
      },
      signOut: async () => {
        await firebaseAuth.signOut()
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)


