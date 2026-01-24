"use client"

import { useAuth } from "@/components/auth-provider"
import { sendEmailVerification } from "firebase/auth"
import { useState } from "react"

export default function EmailVerificationGuard({ children }: { children: React.ReactNode }) {
    const { user, loading, signOut } = useAuth()
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    if (loading) return null

    // If no user, we don't block (login page handles this, or protected routes redirect)
    // We only block LOGGED IN users who are NOT verified.
    if (!user) return <>{children}</>

    if (user.emailVerified) {
        return <>{children}</>
    }

    const handleResend = async () => {
        setSending(true)
        try {
            await sendEmailVerification(user)
            setSent(true)
        } catch (error) {
            console.error("Error sending verification email", error)
            alert("Erreur lors de l'envoi. Attendez quelques minutes avant de réessayer.")
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto text-3xl">
                    ✉️
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vérifiez votre email</h1>

                <p className="text-gray-600 dark:text-gray-300">
                    Un lien de validation a été envoyé à <strong>{user.email}</strong>.
                    <br /><br />
                    Veuillez cliquer sur ce lien pour accéder à l'application.
                </p>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-200">
                    Une fois validé, veuillez rafraîchir cette page.
                </div>

                <div className="space-y-3 pt-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors"
                    >
                        J'ai validé mon email
                    </button>

                    <button
                        onClick={handleResend}
                        disabled={sending || sent}
                        className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {sent ? "Email envoyé !" : (sending ? "Envoi..." : "Renvoyer l'email")}
                    </button>

                    <button
                        onClick={() => signOut()}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        Se déconnecter
                    </button>
                </div>
            </div>
        </div>
    )
}
