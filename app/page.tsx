'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { ComposedChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useToast } from '@/components/toast'
import { Plus, Camera, Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowRight, User } from 'lucide-react'
import Link from 'next/link'

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
  investedViaTransfer: number
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
          if (errorData?.error) errorMessage = errorData.error
        } catch { } // Fallback

        throw new Error(errorMessage)
      }
      const data = await res.json()
      setData(data)
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()

    // Listen for refresh events (e.g. recent transactions)
    const handleRefresh = () => loadDashboardData()
    window.addEventListener('dashboard-refresh', handleRefresh)
    return () => window.removeEventListener('dashboard-refresh', handleRefresh)
  }, [])

  if (loading) {
    return (
      <div className="p-8 h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-8 border border-red-200 dark:border-red-800 text-center max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-400">Erreur</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button onClick={loadDashboardData} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Réessayer</button>
        </div>
      </div>
    )
  }

  // Safe Data Defaults
  const safeData = {
    totalBalance: data.totalBalance || 0,
    monthlyIncome: data.monthlyIncome || 0,
    monthlyExpenses: data.monthlyExpenses || 0,
    savingsRate: data.savingsRate || 0,
    recentTransactions: data.recentTransactions || [],
    monthlyEvolution: data.monthlyEvolution || [],
    investedViaTransfer: data.investedViaTransfer || 0
  }

  // Calcul du "Reste à vivre" réel : Revenus - Dépenses Consommées - Épargne Transférée
  const netBalance = safeData.monthlyIncome - safeData.monthlyExpenses - safeData.investedViaTransfer

  // Formatters
  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }
  const currentMonthName = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  // Greeting logic
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="p-6 h-[calc(100vh-2rem)] overflow-hidden flex flex-col space-y-6 bg-gray-50/50 dark:bg-black/20">

      {/* Header Section */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {greeting} ! 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Voici votre situation financière pour <span className="font-medium capitalize">{currentMonthName}</span>
          </p>
        </div>
      </div>

      {/* Main Grid - Fixed Height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 grid-rows-[auto_1fr] lg:grid-rows-[auto_1fr] gap-4 lg:gap-6">

        {/* Reste à Vivre Card (Top Left, 2 cols) - Compacted */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          <div className="relative z-10 flex flex-row items-start justify-between gap-4">
            <div>
              <h2 className="text-indigo-100 font-medium mb-1 text-sm">Flux du mois (Reste à vivre)</h2>
              <div className="text-3xl lg:text-4xl font-bold tracking-tight">
                {netBalance > 0 ? '+' : ''}{formatCurrency(netBalance)}
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs">
              {netBalance >= 0 ? <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4" /> : <TrendingDown className="w-3 h-3 lg:w-4 lg:h-4" />}
              <span>{netBalance >= 0 ? "Épargne" : "Dépassement"}</span>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-2 pt-3 border-t border-white/20 mt-2">
            <div>
              <div className="text-indigo-100 text-xs mb-0.5 flex items-center gap-1"><ArrowRight className="w-3 h-3 rotate-45" /> Revenus</div>
              <div className="text-sm lg:text-lg font-semibold truncate">{formatCurrency(safeData.monthlyIncome)}</div>
            </div>
            <div className="text-center">
              <div className="text-indigo-100 text-xs mb-0.5 flex items-center justify-center gap-1"><ArrowRight className="w-3 h-3 -rotate-45" /> Dépenses</div>
              <div className="text-sm lg:text-lg font-semibold truncate">{formatCurrency(safeData.monthlyExpenses)}</div>
            </div>
            <div className="text-right">
              <div className="text-indigo-100 text-xs mb-0.5 flex items-center justify-end gap-1"><ArrowRight className="w-3 h-3" /> Transferts</div>
              <div className="text-sm lg:text-lg font-semibold truncate">{formatCurrency(safeData.investedViaTransfer)}</div>
            </div>
          </div>
        </div>

        {/* Total Balance Card (Top Mid) - Compacted */}
        <Link href="/accounts" className="block bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Solde Total</h3>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(safeData.totalBalance)}
          </div>
          <p className="text-xs text-gray-400 mt-1">Tous comptes confondus</p>
        </Link>

        {/* Savings Rate Card (Top Right) - Compacted */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                <PiggyBank className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Taux d'Épargne</h3>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {safeData.savingsRate.toFixed(1)}%
            </span>
          </div>

          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mt-1 overflow-hidden">
            <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(safeData.savingsRate, 100)}%` }}></div>
          </div>
        </div>

        {/* Charts Section (Bottom Left, 3 cols) */}
        <div className="lg:col-span-2 xl:col-span-3 bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col min-h-0">
          <h3 className="text-base font-semibold mb-4 flex-shrink-0">Évolution Budgetaire (6 mois)</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={safeData.monthlyEvolution} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-800" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} dy={10} fontSize={11} stroke="#6b7280" />
                <YAxis axisLine={false} tickLine={false} fontSize={11} stroke="#6b7280" tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  labelStyle={{ color: '#e5e7eb', marginBottom: '0.25rem', fontWeight: 600 }}
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Area type="monotone" dataKey="revenus" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="Revenus" />
                <Area type="monotone" dataKey="depenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Dépenses" />
                <Line type="monotone" dataKey="transferts" stroke="#6366f1" strokeWidth={3} dot={false} name="Transferts" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions List (Bottom Right, 1 col) - Fixed 7 items, no scroll */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Récent</h3>
            <Link href="/transactions" className="text-xs text-blue-600 hover:text-blue-700">Voir tout</Link>
          </div>

          <div className="flex-1 flex flex-col justify-between">
            {safeData.recentTransactions.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">Aucune transaction</div>
            ) : (
              safeData.recentTransactions.slice(0, 7).map(tx => (
                <div key={tx.id} className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-1.5 -mx-2 rounded-lg transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'
                    }`}>
                    {tx.category?.emoji ? (
                      <span className="text-sm">{tx.category.emoji}</span>
                    ) : (
                      tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">{tx.description}</p>
                    <p className="text-xs text-gray-500">{tx.category?.name || 'Sans catégorie'} • {formatDate(tx.date)}</p>
                  </div>
                  <div className={`font-semibold text-xs whitespace-nowrap ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                    {tx.type === 'expense' ? '- ' : '+ '}{formatCurrency(Math.abs(tx.amount))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Tx Mini Button context - Optional, maybe remove if it crowds 7 items? 
               User asked to show 7 items. If I add a button it might overflow.
               I will remove the button to ensure clear 7 items display as requested. 
               The 'Quick Actions' in header already allow adding. */}
        </div>

      </div>
    </div>
  )
}
