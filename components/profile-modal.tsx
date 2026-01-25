'use client'

import { X, User, Shield, Lock, ChevronLeft, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePin } from '@/lib/pin-context'

interface ProfileModalProps {
    user: {
        displayName?: string | null
        email?: string | null
        uid?: string
    } | null
    onClose: () => void
}

type Mode = 'VIEW' | 'VERIFY' | 'NEW' | 'CONFIRM'

export function ProfileModal({ user, onClose }: ProfileModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [mode, setMode] = useState<Mode>('VIEW')
    const { verifyPin, setPin, hasPin } = usePin()

    // PIN State
    const [inputPin, setInputPin] = useState('')
    const [tempNewPin, setTempNewPin] = useState('')
    const [error, setError] = useState(false)
    const [shake, setShake] = useState(false)

    useEffect(() => {
        setIsVisible(true)
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(onClose, 300)
    }

    const handleDigit = (digit: string) => {
        if (shake) return
        if (inputPin.length >= 6) return

        const nextPin = inputPin + digit
        setInputPin(nextPin)

        if (nextPin.length === 6) {
            handlePinComplete(nextPin)
        }
    }

    const handleDelete = () => {
        setInputPin(prev => prev.slice(0, -1))
        setError(false)
    }

    const handlePinComplete = (pin: string) => {
        if (mode === 'VERIFY') {
            if (verifyPin(pin)) {
                setMode('NEW')
                setInputPin('')
                setError(false)
            } else {
                triggerError()
            }
        } else if (mode === 'NEW') {
            setTempNewPin(pin)
            setMode('CONFIRM')
            setInputPin('')
        } else if (mode === 'CONFIRM') {
            if (pin === tempNewPin) {
                setPin(pin)
                // Success animation or message could go here
                handleClose()
            } else {
                triggerError()
                setTimeout(() => {
                    setMode('NEW')
                    setInputPin('')
                    setTempNewPin('')
                }, 600)
            }
        }
    }

    const triggerError = () => {
        setError(true)
        setShake(true)
        setTimeout(() => {
            setShake(false)
            setInputPin('')
        }, 500)
    }

    if (!user) return null

    const initials = user.displayName
        ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : user.email?.substring(0, 2).toUpperCase() || '??'

    const renderKeypad = () => (
        <div className="mt-6 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Dots */}
            <div className="flex gap-3 mb-2">
                {[0, 1, 2, 3, 4, 5].map(i => (
                    <div
                        key={i}
                        className={`w-3 h-3 rounded-full transition-all duration-200 ${i < inputPin.length
                            ? (error ? 'bg-red-500 scale-125' : 'bg-blue-600 scale-125')
                            : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                    />
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                        key={num}
                        onClick={() => handleDigit(num.toString())}
                        className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xl font-semibold text-gray-900 dark:text-gray-100 transition-colors active:scale-95"
                    >
                        {num}
                    </button>
                ))}
                <div className="w-14 h-14" />
                <button
                    onClick={() => handleDigit('0')}
                    className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xl font-semibold text-gray-900 dark:text-gray-100 transition-colors active:scale-95"
                >
                    0
                </button>
                <button
                    onClick={handleDelete}
                    className="w-14 h-14 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 transition-colors flex items-center justify-center active:scale-95"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
            />

            <div className={`relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 transform ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}>

                {/* Header */}
                <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600 relative transition-all duration-300">
                    <button
                        onClick={mode === 'VIEW' ? handleClose : () => {
                            setMode('VIEW')
                            setInputPin('')
                            setError(false)
                        }}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {mode !== 'VIEW' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
                            <h3 className="text-white font-bold text-xl drop-shadow-md">
                                {mode === 'VERIFY' && 'Entrez votre code actuel'}
                                {mode === 'NEW' && 'Nouveau code'}
                                {mode === 'CONFIRM' && 'Confirmez le code'}
                            </h3>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="px-8 pb-8">
                    {mode === 'VIEW' ? (
                        <>
                            <div className="relative -mt-16 mb-6">
                                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-800 flex items-center justify-center mx-auto shadow-lg">
                                    <span className="text-4xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                        {initials}
                                    </span>
                                </div>
                            </div>

                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                    {user.displayName || 'Utilisateur'}
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">
                                    {user.email}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setMode(hasPin ? 'VERIFY' : 'NEW')}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                                >
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">Code de sécurité</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Modifier votre code PIN</p>
                                    </div>
                                    <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                                </button>

                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center gap-4 opacity-75">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">Support ID</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{(user.uid || '').slice(0, 12)}...</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={`${shake ? 'animate-shake' : ''}`}>
                            {renderKeypad()}
                            {error && <p className="text-center text-red-500 text-sm mt-4 font-medium">Code incorrect</p>}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        .animate-shake {
            animation: shake 0.2s ease-in-out 2;
        }
      `}</style>
        </div>
    )
}
