'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useToast } from '@/components/toast'
import { useRef } from 'react'
import { Send, User, Bot, Sparkles, ChevronDown } from 'lucide-react'

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
  totalInvested: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#6366f1']

const PERIODS = [
  { value: '1month', label: '1 mois' },
  { value: '3months', label: '3 mois' },
  { value: '6months', label: '6 mois' },
  { value: '1year', label: '1 an' }
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        {label && <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function SavingsPage() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [statistics, setStatistics] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotaDetails, setQuotaDetails] = useState<any>(null)
  const [period, setPeriod] = useState('3months')
  const { toast } = useToast()

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: 'Bonjour ! Je suis votre assistant financier. Posez-moi une question sur vos dépenses, votre épargne ou demandez-moi un conseil.' }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Mobile & Accordion State
  const [isMobile, setIsMobile] = useState(false)
  const [expandedRecs, setExpandedRecs] = useState<Set<number>>(new Set())
  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set())
  const [expandedTips, setExpandedTips] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleRec = (index: number) => {
    const newExpanded = new Set(expandedRecs)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRecs(newExpanded)
  }

  const toggleInsight = (index: number) => {
    const newExpanded = new Set(expandedInsights)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedInsights(newExpanded)
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMsg: ChatMessage = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)

    try {
      const response = await authFetch('/api/savings/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...chatMessages, userMsg] })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Erreur de réponse')
      }

      const data = await response.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (err: any) {
      console.error(err)
      const errorMessage = err.message || "Impossible de contacter l'assistant"
      toast(errorMessage, 'error')
      setChatMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errorMessage}` }])
    } finally {
      setChatLoading(false)
    }
  }

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
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Investissements</div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(statistics.totalInvested)}
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
                <Tooltip content={<CustomTooltip />} />
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
                <Tooltip content={<CustomTooltip />} />
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
                    className={`p-4 rounded-lg border-l-4 transition-all duration-200 ${getPriorityColor(rec.priority)} ${isMobile ? 'cursor-pointer active:scale-[0.99]' : ''}`}
                    onClick={() => isMobile && toggleRec(index)}
                  >
                    <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-start justify-between gap-4'} mb-2`}>
                      <div className="flex items-start justify-between w-full gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white leading-tight">{rec.title}</h4>
                        {isMobile && (
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-300 mt-0.5 ${expandedRecs.has(index) ? 'rotate-180' : ''}`}
                          />
                        )}
                      </div>
                      {rec.category && (
                        <span className={`inline-flex px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded font-medium ${isMobile ? 'self-start' : 'flex-shrink-0'}`}>
                          {rec.category}
                        </span>
                      )}
                    </div>
                    <div className={`text-gray-700 dark:text-gray-300 overflow-hidden transition-all duration-300 ${isMobile ? (expandedRecs.has(index) ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0') : 'block'}`}>
                      {rec.description}
                    </div>
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
                    className={`p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 ${isMobile ? 'cursor-pointer active:scale-[0.99]' : ''}`}
                    onClick={() => isMobile && toggleInsight(index)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className={`font-semibold mb-0 ${getImpactColor(insight.impact)} flex-1`}>
                        {insight.title}
                      </h4>
                      {isMobile && (
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-300 ${expandedInsights.has(index) ? 'rotate-180' : ''}`}
                        />
                      )}
                    </div>
                    <div className={`text-sm text-gray-700 dark:text-gray-300 overflow-hidden transition-all duration-300 ${isMobile ? (expandedInsights.has(index) ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0') : 'block mt-2'}`}>
                      {insight.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conseils budgétaires */}
          {analysis.budgetTips.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3
                className={`text-xl font-semibold mb-4 flex items-center justify-between gap-2 text-blue-800 dark:text-blue-200 ${isMobile ? 'cursor-pointer' : ''}`}
                onClick={() => isMobile && setExpandedTips(!expandedTips)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💼</span>
                  <span className="flex-1">Conseils budgétaires</span>
                </div>
                {isMobile && (
                  <ChevronDown
                    className={`w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform duration-300 ${expandedTips ? 'rotate-180' : ''}`}
                  />
                )}
              </h3>
              <ul className={`space-y-3 overflow-hidden transition-all duration-300 ${isMobile ? (expandedTips ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0') : 'block'}`}>
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

      {/* Assistant IA Chat */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800/50 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Assistant Budgetwise</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Posez vos questions librement à votre IA personnelle</p>
          </div>
        </div>

        <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-950/50">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user'
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-3 rounded-2xl text-sm ${msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm'
                  }`}>
                  <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-line">
                    {msg.content}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ex: Combien ai-je dépensé en courses le mois dernier ?"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || chatLoading}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

    </div>
  )
}
