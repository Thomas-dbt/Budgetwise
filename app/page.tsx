'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useToast } from '@/components/toast'

interface DashboardData {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  savingsRate: number
  recentTransactions: Array<{
    id: string
    description: string
    amount: number
    type: string
    date: string
    category: { name: string; emoji: string } | null
    account: { name: string }
  }>
  monthlyEvolution: Array<{
    month: string
    revenus: number
    depenses: number
  }>
}

const categoryColors: Record<string, string> = {
  'Alimentation': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Transport': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Logement': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Loisirs': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Santé': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Shopping': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Abonnements': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Énergie': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Assurances': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'Voyages': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Autres': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/dashboard')
      if (!res.ok) {
        let errorMessage = 'Erreur lors du chargement des données'
        try {
          const errorData = await res.json()
          if (errorData?.error) {
            errorMessage = errorData.error
          }
        } catch {
          // Si on ne peut pas parser le JSON, utiliser le message par défaut
          if (res.status === 401) {
            errorMessage = 'Vous n\'êtes pas autorisé. Veuillez vous reconnecter.'
          } else if (res.status === 500) {
            errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.'
          } else if (res.status === 404) {
            errorMessage = 'Service non trouvé.'
          }
        }
        throw new Error(errorMessage)
      }
      const data = await res.json()
      setData(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-400">
              Erreur lors du chargement
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || 'Impossible de charger les données du tableau de bord.'}
            </p>
            <button
              onClick={loadDashboardData}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Valeurs par défaut pour éviter les erreurs
  const safeData = {
    totalBalance: data.totalBalance || 0,
    monthlyIncome: data.monthlyIncome || 0,
    monthlyExpenses: data.monthlyExpenses || 0,
    savingsRate: data.savingsRate || 0,
    recentTransactions: data.recentTransactions || [],
    monthlyEvolution: data.monthlyEvolution || []
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const months = ['janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
    return `${date.getDate()} ${months[date.getMonth()]}`
  }

  return (
    <div className="p-8 h-screen overflow-hidden flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold">Tableau de Bord</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Vue d'overview de vos finances</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 flex-shrink-0">
        <KPICard
          title="Solde Total"
          value={formatCurrency(safeData.totalBalance)}
        />
        <KPICard
          title="Revenus du Mois"
          value={formatCurrency(safeData.monthlyIncome)}
        />
        <KPICard
          title="Dépenses du Mois"
          value={formatCurrency(safeData.monthlyExpenses)}
        />
        <KPICard
          title="Taux d'Épargne"
          value={`${safeData.savingsRate.toFixed(1)} %`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Graphique d'évolution */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold mb-6 flex-shrink-0">Évolution sur 6 mois</h2>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={safeData.monthlyEvolution}>
                <defs>
                  <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDepenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis
                  dataKey="month"
                  stroke="#6b7280"
                  className="dark:stroke-gray-400"
                />
                <YAxis
                  stroke="#6b7280"
                  className="dark:stroke-gray-400"
                  tickFormatter={(value) => `${value}€`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenus"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorRevenus)"
                  name="Revenus"
                />
                <Area
                  type="monotone"
                  dataKey="depenses"
                  stroke="#ef4444"
                  fillOpacity={1}
                  fill="url(#colorDepenses)"
                  name="Dépenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transactions récentes */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col min-h-0">
          <h2 className="text-lg font-semibold mb-6 flex-shrink-0">Transactions Récentes</h2>
          <div className="space-y-4 overflow-hidden flex-1 min-h-0">
            {safeData.recentTransactions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Aucune transaction
              </p>
            ) : (
              safeData.recentTransactions.slice(0, 8).map((tx) => (
                <div key={tx.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'income'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                    <span className={tx.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {tx.type === 'income' ? '↑' : '↓'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {tx.account.name} • {formatDate(tx.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${tx.type === 'income'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                      }`}>
                      {tx.type === 'expense' ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                    </p>
                    {tx.category && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[tx.category.name] || categoryColors['Autres']
                        }`}>
                        {tx.category.name.toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value }: {
  title: string
  value: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
