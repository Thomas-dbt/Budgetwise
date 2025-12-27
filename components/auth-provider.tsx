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
    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser: FirebaseUser | null) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
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


