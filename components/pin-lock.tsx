"use client"

import { useState, useEffect } from "react"
import { usePin } from "@/lib/pin-context"
import { useAuth } from "@/components/auth-provider"
import { usePathname } from "next/navigation"

export default function PinLock() {
    const { isLocked, hasPin, verifyPin, setPin: savePin, unlock } = usePin()
    const { user, loading } = useAuth()
    const pathname = usePathname()
    const [inputPin, setInputPin] = useState("")
    const [confirmPin, setConfirmPin] = useState("")
    const [error, setError] = useState(false)
    const [mode, setMode] = useState<'UNLOCK' | 'SETUP' | 'CONFIRM' | 'FORGOT_REQUEST' | 'FORGOT_VERIFY'>('UNLOCK')
    const [shake, setShake] = useState(false)
    const [keys, setKeys] = useState<string[]>(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'])
    const [email, setEmail] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [requestMessage, setRequestMessage] = useState("")

    useEffect(() => {
        // Randomize keys on mount or when locked state changes
        if (isLocked) {
            shuffleKeys()
            // Reset state
            // If user was in forgot flow and closed/reopened, maybe reset? 
            // But actually isLocked stays true. 
            // If we just loaded, check hasPin.
            if (!hasPin) {
                setMode('SETUP')
            } else {
                setMode('UNLOCK')
            }
        }
    }, [isLocked]) // Removed hasPin dependency to avoid resetting mode when hasPin changes during setup

    const shuffleKeys = () => {
        const newKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
        for (let i = newKeys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newKeys[i], newKeys[j]] = [newKeys[j], newKeys[i]];
        }
        setKeys(newKeys)
    }

    useEffect(() => {
        if (!isLocked) {
            setInputPin("")
            setConfirmPin("")
            setError(false)
            setMode('UNLOCK') // Reset to default for next time
            return
        }
    }, [isLocked])

    const PIN_LENGTH = 6

    const handleDigit = async (digit: string) => {
        if (shake || isSubmitting) return // Block input during error or submission

        if (mode === 'UNLOCK') {
            const nextPin = inputPin + digit
            setInputPin(nextPin)
            if (nextPin.length === PIN_LENGTH) {
                if (verifyPin(nextPin)) {
                    unlock()
                } else {
                    triggerError()
                }
            }
        } else if (mode === 'SETUP') {
            const nextPin = inputPin + digit
            setInputPin(nextPin)
            if (nextPin.length === PIN_LENGTH) {
                setMode('CONFIRM')
                setConfirmPin("")
            }
        } else if (mode === 'CONFIRM') {
            const nextConfirm = confirmPin + digit
            setConfirmPin(nextConfirm)
            if (nextConfirm.length === PIN_LENGTH) {
                if (inputPin === nextConfirm) {
                    savePin(inputPin)
                } else {
                    triggerError()
                    setTimeout(() => {
                        setMode('SETUP')
                        setInputPin("")
                        setConfirmPin("")
                    }, 500)
                }
            }
        } else if (mode === 'FORGOT_VERIFY') {
            const nextPin = inputPin + digit
            setInputPin(nextPin)
            if (nextPin.length === PIN_LENGTH) {
                // Verify code
                setIsSubmitting(true)
                try {
                    const res = await fetch('/api/auth/pin-reset/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, code: nextPin })
                    })
                    const data = await res.json()
                    if (data.success) {
                        setMode('SETUP')
                        setInputPin("")
                        setConfirmPin("")
                        setRequestMessage("Code validé. Définissez votre nouveau code.")
                    } else {
                        triggerError()
                        setRequestMessage(data.error || "Code invalide")
                    }
                } catch (e) {
                    triggerError()
                } finally {
                    setIsSubmitting(false)
                }
            }
        }
    }

    const handleDelete = () => {
        if (mode === 'CONFIRM') {
            setConfirmPin(prev => prev.slice(0, -1))
        } else {
            setInputPin(prev => prev.slice(0, -1))
        }
    }

    const triggerError = () => {
        setError(true)
        setShake(true)
        setTimeout(() => {
            setShake(false)
            setError(false)
            if (mode === 'UNLOCK' || mode === 'FORGOT_VERIFY') setInputPin("")
        }, 500)
    }

    const handleForgotRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return
        setIsSubmitting(true)
        try {
            const res = await fetch('/api/auth/pin-reset/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
            const data = await res.json()
            if (data.success) {
                setMode('FORGOT_VERIFY')
                setInputPin("")
                setRequestMessage("Code envoyé par email.")
            } else {
                setRequestMessage(data.error || "Erreur lors de l'envoi")
            }
        } catch (e) {
            setRequestMessage("Une erreur est survenue")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isLocked) return null
    if (!loading && !user) return null
    if (pathname === '/login') return null

    const currentInput = mode === 'CONFIRM' ? confirmPin : inputPin

    // Dynamic titles
    let title = 'Entrez votre code'
    let subTitle = 'Code à 6 chiffres'

    if (mode === 'SETUP') {
        title = 'Nouveau Code Sécurité'
        subTitle = 'Créez votre code à 6 chiffres'
    } else if (mode === 'CONFIRM') {
        title = 'Confirmez le code'
        subTitle = 'Vérifiez la saisie'
    } else if (mode === 'FORGOT_REQUEST') {
        title = 'Réinitialisation PIN'
        subTitle = 'Entrez votre email pour recevoir un code'
    } else if (mode === 'FORGOT_VERIFY') {
        title = 'Vérification'
        subTitle = 'Entrez le code reçu par email'
    }


    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 text-white flex flex-col items-center justify-center p-4">
            <div className={`w-full max-w-sm flex flex-col items-center space-y-8 ${shake ? 'animate-shake' : ''}`}>

                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold">{title}</h1>
                    <p className={`text-sm ${error ? 'text-red-400' : 'text-slate-400'}`}>
                        {error ? 'Code incorrect' : subTitle}
                    </p>
                    {requestMessage && (
                        <p className="text-xs text-blue-300 mt-2">{requestMessage}</p>
                    )}
                </div>

                {mode === 'FORGOT_REQUEST' ? (
                    <form onSubmit={handleForgotRequest} className="w-full space-y-4">
                        <input
                            type="email"
                            placeholder="votre@email.com"
                            className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => { setMode('UNLOCK'); setRequestMessage("") }}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !email}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white py-3 rounded-lg font-medium transition-colors"
                            >
                                {isSubmitting ? 'Envoi...' : 'Envoyer'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        {/* Dots Display (6 dots) */}
                        <div className="flex gap-4 mb-4">
                            {[0, 1, 2, 3, 4, 5].map(i => (
                                <div
                                    key={i}
                                    className={`w-3 h-3 rounded-full transition-all duration-200 ${i < currentInput.length
                                        ? (error ? 'bg-red-500 scale-125' : 'bg-blue-500 scale-125')
                                        : 'bg-slate-700'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Randomized Keypad with Standard Layout */}
                        <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                            {/* First 9 keys in the grid */}
                            {keys.slice(0, 9).map(num => (
                                <button key={num} onClick={() => handleDigit(num)} className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 text-2xl font-semibold flex items-center justify-center active:scale-95 transition-all">
                                    {num}
                                </button>
                            ))}

                            {/* Empty slot or Forgot PIN */}
                            <div className="w-16 h-16 flex items-center justify-center">
                                {mode === 'UNLOCK' && (
                                    <button
                                        onClick={() => { setMode('FORGOT_REQUEST'); setRequestMessage("") }}
                                        className="text-xs text-slate-500 hover:text-slate-300 text-center"
                                    >
                                        Oublié ?
                                    </button>
                                )}
                            </div>

                            {/* 10th key at bottom center (where 0 usually is) */}
                            <button onClick={() => handleDigit(keys[9])} className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 text-2xl font-semibold flex items-center justify-center active:scale-95 transition-all">
                                {keys[9]}
                            </button>

                            {/* Delete Button */}
                            <button onClick={handleDelete} className="w-16 h-16 rounded-full hover:bg-slate-800/50 text-slate-400 flex items-center justify-center active:scale-95 transition-all">
                                ⌫
                            </button>
                        </div>
                    </>
                )}
            </div>


            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 2;
                }
            `}</style>
        </div>
    )
}
