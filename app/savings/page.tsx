'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useToast } from '@/components/toast'

interface AnalysisData {
  summary: string
  strengths: string[]
  concerns: string[]
  recommendations: Array<{
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    category?: string
  }>
  insights: Array<{
    title: string
    description: string
    impact: 'positive' | 'negative' | 'neutral'
  }>
  budgetTips: string[]
}

interface StatisticsData {
  period: string
  totalIncome: number
  totalExpenses: number
  savings: number
  savingsRate: number
  topCategories: Array<{ name: string; amount: number }>
  monthlyEvolution: Array<{ month: string; income: number; expenses: number }>
  totalAccounts: number
  totalBalance: number
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#6366f1']

const PERIODS = [
  { value: '1month', label: '1 mois' },
  { value: '3months', label: '3 mois' },
  { value: '6months', label: '6 mois' },
  { value: '1year', label: '1 an' }
]

export default function SavingsPage() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [statistics, setStatistics] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotaDetails, setQuotaDetails] = useState<any>(null)
  const [period, setPeriod] = useState('3months')
  const { toast } = useToast()

  useEffect(() => {
    analyzeSavings()
  }, [period])

  const analyzeSavings = async () => {
    try {
      setLoading(true)
      setError(null)
      setQuotaDetails(null)
      const response = await authFetch('/api/savings/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        
        // Stocker les détails du quota si disponibles
        if (errorData.quotaDetails) {
          setQuotaDetails(errorData.quotaDetails)
        }
        
        // Utiliser directement le code d'erreur de l'API si disponible
        const apiError = errorData.error || `Erreur ${response.status}`
        throw new Error(apiError)
      }

      const data = await response.json()
      setAnalysis(data.analysis)
      setStatistics(data.statistics)
    } catch (err: any) {
      console.error('Error analyzing savings:', err)
      
      // Nettoyer le message d'erreur pour l'affichage utilisateur
      let errorMessage = err.message || 'Impossible d\'effectuer l\'analyse'
      
      // Détecter et simplifier les erreurs de quota Gemini
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'QUOTA_EXCEEDED'
      } else if (errorMessage.includes('GEMINI_API_KEY')) {
        errorMessage = 'API_KEY_MISSING'
      } else if (errorMessage.includes('Erreur API Gemini')) {
        // Extraire juste le type d'erreur sans les détails JSON
        const match = errorMessage.match(/Erreur API Gemini: (\d+)/)
        if (match) {
          const statusCode = match[1]
          if (statusCode === '429') {
            errorMessage = 'QUOTA_EXCEEDED'
          } else {
            errorMessage = `Erreur API (${statusCode})`
          }
        } else {
          errorMessage = 'Erreur lors de l\'analyse IA'
        }
      } else if (errorMessage.length > 200) {
        // Tronquer les messages trop longs
        errorMessage = errorMessage.substring(0, 200) + '...'
      }
      
      setError(errorMessage)
      
      // Toast avec message simplifié
      const toastMessage = errorMessage === 'QUOTA_EXCEEDED' 
        ? 'Quota API dépassé. Réessayez plus tard.'
        : errorMessage === 'API_KEY_MISSING'
        ? 'Clé API non configurée'
        : errorMessage
      
      toast(toastMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      case 'medium':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'low':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'text-green-600 dark:text-green-400'
      case 'negative':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Économies</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Analyse intelligente de vos dépenses et conseils personnalisés par IA
        </p>
      </div>

      {/* Contrôles */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PERIODS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <button
          onClick={analyzeSavings}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? 'Analyse en cours...' : 'Actualiser l\'analyse'}
        </button>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                Erreur lors de l'analyse
              </h3>
              {error === 'QUOTA_EXCEEDED' || error.includes('429') || error.includes('quota') || error.includes('RESOURCE_EXHAUSTED') ? (
                <div className="space-y-2">
                  <p className="text-red-700 dark:text-red-300">
                    Le quota de l'API Gemini a été dépassé. L'analyse IA n'est temporairement pas disponible.
                  </p>
                  
                  {/* Afficher les détails du quota si disponibles */}
                  {quotaDetails && (
                    <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded text-sm">
                      {quotaDetails.retryDelay && (
                        <p className="text-red-800 dark:text-red-200 mb-2">
                          <strong>⏱️ Temps d'attente estimé :</strong> {Math.ceil(parseFloat(quotaDetails.retryDelay))} secondes
                          <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                            (Une tentative automatique a été effectuée)
                          </span>
                        </p>
                      )}
                      {quotaDetails.quotaMetrics && quotaDetails.quotaMetrics.length > 0 && (
                        <div className="mb-2">
                          <p className="text-red-800 dark:text-red-200 font-semibold mb-1">📊 Limites dépassées :</p>
                          <ul className="list-disc list-inside text-red-700 dark:text-red-300 space-y-1">
                            {quotaDetails.quotaMetrics.slice(0, 3).map((metric: string, idx: number) => (
                              <li key={idx} className="text-xs">{metric}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        💡 <strong>Explication :</strong> Vous avez atteint la limite d'utilisation gratuite de l'API Gemini. 
                        {quotaDetails.retryDelay 
                          ? ` Une tentative automatique après ${Math.ceil(parseFloat(quotaDetails.retryDelay))} secondes a également échoué.`
                          : ' Le quota gratuit est épuisé.'}
                        {' '}Le quota gratuit est très limité. Réessayez dans quelques heures ou passez à un plan payant pour des limites plus élevées.
                      </p>
                    </div>
                  )}
                  
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Vous pouvez toujours consulter vos statistiques ci-dessous. Réessayez plus tard pour obtenir l'analyse complète.
                  </p>
                </div>
              ) : error === 'API_KEY_MISSING' || error.includes('GEMINI_API_KEY') ? (
                <p className="text-red-700 dark:text-red-300">
                  Veuillez configurer votre clé API Gemini dans les variables d'environnement.
                </p>
              ) : (
                <p className="text-red-700 dark:text-red-300">
                  {error.length > 200 ? error.substring(0, 200) + '...' : error}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setError(null)
                setQuotaDetails(null)
              }}
              className="flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
              aria-label="Fermer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Statistiques principales */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Revenus totaux</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(statistics.totalIncome)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Dépenses totales</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(statistics.totalExpenses)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Épargne</div>
            <div className={`text-3xl font-bold ${statistics.savings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(statistics.savings)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Taux d'épargne</div>
            <div className={`text-3xl font-bold ${statistics.savingsRate >= 20 ? 'text-green-600 dark:text-green-400' : statistics.savingsRate >= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
              {statistics.savingsRate.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Graphiques */}
      {statistics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Évolution mensuelle */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold mb-6">Évolution mensuelle</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={statistics.monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={formatMonth}
                  stroke="#6b7280"
                  className="dark:stroke-gray-400"
                />
                <YAxis 
                  stroke="#6b7280"
                  className="dark:stroke-gray-400"
                  tickFormatter={(value) => `${value}€`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={formatMonth}
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  name="Revenus" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  name="Dépenses" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Répartition par catégorie */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold mb-6">Top catégories de dépenses</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statistics.topCategories}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statistics.topCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Analyse IA */}
      {loading && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-12 border border-gray-200 dark:border-gray-800 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Analyse en cours par l'IA...</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">Cela peut prendre quelques instants</p>
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-6">
          {/* Résumé */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Résumé de l'analyse
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Points forts et points d'attention */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analysis.strengths.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-800 dark:text-green-200">
                  <span>✅</span>
                  Points forts
                </h3>
                <ul className="space-y-2">
                  {analysis.strengths.map((strength, index) => (
                    <li key={index} className="text-green-700 dark:text-green-300 flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.concerns.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-800 dark:text-red-200">
                  <span>⚠️</span>
                  Points d'attention
                </h3>
                <ul className="space-y-2">
                  {analysis.concerns.map((concern, index) => (
                    <li key={index} className="text-red-700 dark:text-red-300 flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommandations */}
          {analysis.recommendations.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">💡</span>
                Recommandations personnalisées
              </h3>
              <div className="space-y-4">
                {analysis.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${getPriorityColor(rec.priority)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{rec.title}</h4>
                      {rec.category && (
                        <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded">
                          {rec.category}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{rec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {analysis.insights.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.insights.map((insight, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <h4 className={`font-semibold mb-2 ${getImpactColor(insight.impact)}`}>
                      {insight.title}
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{insight.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conseils budgétaires */}
          {analysis.budgetTips.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <span className="text-2xl">💼</span>
                Conseils budgétaires
              </h3>
              <ul className="space-y-3">
                {analysis.budgetTips.map((tip, index) => (
                  <li key={index} className="text-blue-700 dark:text-blue-300 flex items-start gap-3">
                    <span className="mt-1 text-lg">💡</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Message si aucune analyse */}
      {!analysis && !loading && !error && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-12 border border-gray-200 dark:border-gray-800 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">💼</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Prêt pour l'analyse
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Cliquez sur "Actualiser l'analyse" pour générer une analyse personnalisée de vos économies avec l'IA
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
