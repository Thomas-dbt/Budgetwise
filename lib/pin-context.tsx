"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'

interface PinContextType {
    isLocked: boolean
    hasPin: boolean
    verifyPin: (pin: string) => boolean
    setPin: (pin: string) => void
    unlock: () => void
}

const PinContext = createContext<PinContextType>({
    isLocked: false,
    hasPin: false,
    verifyPin: () => false,
    setPin: () => { },
    unlock: () => { }
})

// 15 minutes in milliseconds
const INACTIVITY_TIMEOUT = 15 * 60 * 1000

export function PinProvider({ children }: { children: React.ReactNode }) {
    const [isLocked, setIsLocked] = useState(false)
    const [hasPin, setHasPin] = useState(false)
    const [isInitialized, setIsInitialized] = useState(false)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const router = useRouter()

    // We need to access the user to reset lock on logout
    // We import usage here, assuming PinProvider is inside AuthProvider
    const { user, loading } = useAuth()

    useEffect(() => {
        if (loading) return
        if (!user) {
            // Even if no user, we must mark as initialized so the app can render (e.g. login page)
            setIsInitialized(true)
            return
        }

        const userPinKey = `budgetwise_pin_${user.uid}`
        const storedPin = localStorage.getItem(userPinKey)

        if (storedPin) {
            if (storedPin.length !== 6) {
                // Migration: Invalidate old 4-digit PINs
                localStorage.removeItem(userPinKey)
                setHasPin(false)
                setIsLocked(true) // Force setup
            } else {
                setHasPin(true)
                setIsLocked(true)
            }
        } else {
            setHasPin(false)
            setIsLocked(true) // Force setup
        }
        setIsInitialized(true)
    }, [user, loading])

    // Re-lock on logout
    useEffect(() => {
        if (!loading && !user) {
            setIsLocked(true)
            setHasPin(false)
        }
    }, [user, loading])

    const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (!isLocked && hasPin) {
            timerRef.current = setTimeout(() => {
                setIsLocked(true)
            }, INACTIVITY_TIMEOUT)
        }
    }

    useEffect(() => {
        if (isLocked) return

        // Activity listeners
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
        const handleActivity = () => resetTimer()

        events.forEach(event => window.addEventListener(event, handleActivity))
        resetTimer() // Start timer

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            events.forEach(event => window.removeEventListener(event, handleActivity))
        }
    }, [isLocked, hasPin])

    const verifyPin = (inputPin: string) => {
        if (!user) return false
        const userPinKey = `budgetwise_pin_${user.uid}`
        const storedPin = localStorage.getItem(userPinKey)
        return storedPin === inputPin
    }

    const setPin = (newPin: string) => {
        if (!user) return
        const userPinKey = `budgetwise_pin_${user.uid}`
        localStorage.setItem(userPinKey, newPin)
        setHasPin(true)
        setIsLocked(false) // Unlock after setting
    }

    const unlock = () => {
        setIsLocked(false)
    }

    // Don't render children until we know the PIN state to avoid flicker
    if (!isInitialized) return null

    return (
        <PinContext.Provider value={{ isLocked, hasPin, verifyPin, setPin, unlock }}>
            {children}
        </PinContext.Provider>
    )
}

export const usePin = () => useContext(PinContext)
