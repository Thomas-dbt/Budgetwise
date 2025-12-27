"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { emailSignIn, emailSignUp, googleSignIn } from "@/lib/firebase/client"
import { useAuth } from "@/components/auth-provider"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      router.replace(searchParams.get("redirect") || "/")
    }
  }, [user, router, searchParams])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === "signin") {
        await emailSignIn(email, password)
      } else {
        await emailSignUp(email, password)
      }
      router.replace(searchParams.get("redirect") || "/")
    } catch (err: any) {
      setError(err?.message || "Impossible de se connecter")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setLoading(true)
    try {
      await googleSignIn()
      router.replace(searchParams.get("redirect") || "/")
    } catch (err: any) {
      setError(err?.message || "Connexion Google impossible")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="max-w-md w-full bg-slate-800/60 border border-slate-700 rounded-2xl p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Connexion BudgetWise</h1>
          <p className="text-sm text-slate-300">
            Identifiez-vous pour accéder à vos comptes et transactions.
          </p>
        </div>

        <div className="grid grid-cols-2 bg-slate-900/60 p-1 rounded-lg">
          <button
            onClick={() => setMode("signin")}
            className={`py-2 rounded-md text-sm ${
              mode === "signin" ? "bg-blue-600 text-white" : "text-slate-300"
            }`}
          >
            Se connecter
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`py-2 rounded-md text-sm ${
              mode === "signup" ? "bg-blue-600 text-white" : "text-slate-300"
            }`}
          >
            Créer un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="vous@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-400 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Connexion..." : mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-400 uppercase">
          <span className="h-px flex-1 bg-slate-700" />
          <span>Ou</span>
          <span className="h-px flex-1 bg-slate-700" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full rounded-md border border-slate-600 bg-slate-900/70 py-2 font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
        >
          Continuer avec Google
        </button>
      </div>
    </div>
  )
}

